/**
 * Centralized data service for loading and exposing all static JSON data.
 * All components access campaign data through this service — never load JSON directly.
 *
 * Data files live under each campaign's folder (`campaigns/{id}/data/`).
 * The active campaign is determined by CampaignService, and data reloads
 * automatically when the campaign changes.
 */

import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable, forkJoin, catchError, of, switchMap } from 'rxjs';

import { type Character } from '@guild/models/character.model';
import { type Npc } from '@guild/models/npc.model';
import { type Session } from '@guild/models/session.model';
import { type GameMap } from '@guild/models/map.model';
import { type Relationship } from '@guild/models/relationship.model';
import { type Campaign } from '@guild/models/campaign.model';
import { CampaignService } from '@guild/services/campaign.service';

/** Tracks the loading state of the data layer. */
interface DataState {
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly error: string | undefined;
}

/**
 * Recursively resolves campaign-relative image paths in JSON data.
 * Replaces any string value starting with `images/` with the full path
 * (e.g., `images/hero/avatar.jpg` → `campaigns/example-campaign/images/hero/avatar.jpg`).
 *
 * @param data - The data to process (can be any JSON-compatible value).
 * @param imagesBasePath - The base path to prepend (e.g., `campaigns/example-campaign`).
 * @returns A deep copy with resolved image paths.
 */
function resolveImagePaths<T>(data: T, imagesBasePath: string): T {
  if (typeof data === 'string') {
    if (data.startsWith('images/')) {
      return `${imagesBasePath}/${data}` as unknown as T;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item: unknown) => resolveImagePaths(item, imagesBasePath)) as unknown as T;
  }

  if (data !== null && typeof data === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      resolved[key] = resolveImagePaths(value, imagesBasePath);
    }
    return resolved as T;
  }

  return data;
}

/**
 * Centralized data access layer.
 * Loads all JSON files when a campaign becomes active and exposes typed signals.
 * Data reloads automatically when the active campaign changes.
 *
 * @example
 * ```typescript
 * private readonly dataService = inject(DataService);
 * readonly characters = this.dataService.characters;
 * ```
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly campaignService = inject(CampaignService);

  private readonly _characters: WritableSignal<ReadonlyArray<Character>> = signal([]);
  private readonly _npcs: WritableSignal<ReadonlyArray<Npc>> = signal([]);
  private readonly _sessions: WritableSignal<ReadonlyArray<Session>> = signal([]);
  private readonly _maps: WritableSignal<ReadonlyArray<GameMap>> = signal([]);
  private readonly _partyRelationships: WritableSignal<ReadonlyArray<Relationship>> = signal([]);
  private readonly _npcRelationships: WritableSignal<ReadonlyArray<Relationship>> = signal([]);
  private readonly _campaign: WritableSignal<Campaign | undefined> = signal(undefined);

  private readonly _state: WritableSignal<DataState> = signal({
    isLoading: false,
    isLoaded: false,
    error: undefined,
  });

  /** All player characters. */
  readonly characters: Signal<ReadonlyArray<Character>> = this._characters.asReadonly();

  /** All non-player characters. */
  readonly npcs: Signal<ReadonlyArray<Npc>> = this._npcs.asReadonly();

  /** All campaign sessions. */
  readonly sessions: Signal<ReadonlyArray<Session>> = this._sessions.asReadonly();

  /** All visited maps / locations. */
  readonly maps: Signal<ReadonlyArray<GameMap>> = this._maps.asReadonly();

  /** Party member relationships. */
  readonly partyRelationships: Signal<ReadonlyArray<Relationship>> =
    this._partyRelationships.asReadonly();

  /** Set of IDs of minor NPCs, hidden from relationship views. */
  private readonly minorNpcIds: Signal<ReadonlySet<string>> = computed(
    () =>
      new Set(
        this._npcs()
          .filter((n) => n.isMinor === true)
          .map((n) => n.id),
      ),
  );

  /** NPC-to-party relationships (minor NPCs are filtered out). */
  readonly npcRelationships: Signal<ReadonlyArray<Relationship>> = computed(() => {
    const minorIds = this.minorNpcIds();
    return this._npcRelationships().filter(
      (r) => !minorIds.has(r.sourceId) && !minorIds.has(r.targetId),
    );
  });

  /** Campaign metadata. */
  readonly campaign: Signal<Campaign | undefined> = this._campaign.asReadonly();

  /** Current loading state. */
  readonly state: Signal<DataState> = this._state.asReadonly();

  /** Whether data has finished loading (successfully or with error). */
  readonly isLoaded: Signal<boolean> = computed(() => this._state().isLoaded);

  /** Whether data is currently being fetched. */
  readonly isLoading: Signal<boolean> = computed(() => this._state().isLoading);

  constructor() {
    effect(() => {
      const basePath = this.campaignService.dataBasePath();
      if (basePath !== undefined) {
        this.loadAllData(basePath);
      } else {
        this.clearAllData();
      }
    });
  }

  /**
   * Finds a player character by ID.
   * @param id - The unique character identifier.
   * @returns The matching character, or undefined if not found.
   */
  getCharacterById(id: string): Signal<Character | undefined> {
    return computed(() => this._characters().find((c) => c.id === id));
  }

  /**
   * Finds an NPC by ID.
   * @param id - The unique NPC identifier.
   * @returns The matching NPC, or undefined if not found.
   */
  getNpcById(id: string): Signal<Npc | undefined> {
    return computed(() => this._npcs().find((n) => n.id === id));
  }

  /**
   * Finds a session by ID.
   * @param id - The unique session identifier.
   * @returns The matching session, or undefined if not found.
   */
  getSessionById(id: string): Signal<Session | undefined> {
    return computed(() => this._sessions().find((s) => s.id === id));
  }

  /**
   * Returns all sessions sorted by session number (ascending).
   * @returns Sorted readonly array of sessions.
   */
  readonly sortedSessions: Signal<ReadonlyArray<Session>> = computed(() =>
    [...this._sessions()].sort((a, b) => a.sessionNumber - b.sessionNumber),
  );

  /**
   * Finds a map/location by ID.
   * @param id - The unique map identifier.
   * @returns The matching map, or undefined if not found.
   */
  getMapById(id: string): Signal<GameMap | undefined> {
    return computed(() => this._maps().find((m) => m.id === id));
  }

  /**
   * Returns all relationships involving a specific character or NPC.
   * Searches both party and NPC relationships.
   * @param entityId - The character or NPC ID to search for.
   * @returns Filtered readonly array of relationships.
   */
  getRelationshipsForEntity(entityId: string): Signal<ReadonlyArray<Relationship>> {
    return computed(() => {
      const minorIds = this.minorNpcIds();
      const party = this._partyRelationships().filter(
        (r) => r.sourceId === entityId || r.targetId === entityId,
      );
      const npc = this._npcRelationships().filter(
        (r) =>
          (r.sourceId === entityId || r.targetId === entityId) &&
          !minorIds.has(r.sourceId) &&
          !minorIds.has(r.targetId),
      );
      return [...party, ...npc];
    });
  }

  /**
   * Finds a specific relationship between two entities.
   * Searches both party and NPC relationships, checking both directions.
   * @param entityA - The first entity ID.
   * @param entityB - The second entity ID.
   * @returns The matching relationship, or undefined if not found.
   */
  getRelationshipBetween(entityA: string, entityB: string): Signal<Relationship | undefined> {
    return computed(() => {
      const minorIds = this.minorNpcIds();
      const allRelationships = [
        ...this._partyRelationships(),
        ...this._npcRelationships().filter(
          (r) => !minorIds.has(r.sourceId) && !minorIds.has(r.targetId),
        ),
      ];
      return allRelationships.find(
        (r) =>
          (r.sourceId === entityA && r.targetId === entityB) ||
          (r.sourceId === entityB && r.targetId === entityA),
      );
    });
  }

  /**
   * Clears all data signals when no campaign is active.
   */
  private clearAllData(): void {
    this._characters.set([]);
    this._npcs.set([]);
    this._sessions.set([]);
    this._maps.set([]);
    this._partyRelationships.set([]);
    this._npcRelationships.set([]);
    this._campaign.set(undefined);
    this._state.set({ isLoading: false, isLoaded: false, error: undefined });
  }

  /**
   * Loads all JSON data files in parallel for the given campaign base path.
   * Characters, NPCs, and sessions are loaded from individual files via manifests.
   * Image paths in loaded data are resolved to full paths.
   * @param basePath - The campaign data base path (e.g., `campaigns/example-campaign/data`).
   */
  private loadAllData(basePath: string): void {
    this._state.set({ isLoading: true, isLoaded: false, error: undefined });

    const imagesBase = basePath.replace(/\/data$/, '');

    forkJoin({
      characters: this.loadFromManifest<Character>(`${basePath}/characters`),
      npcs: this.loadFromManifest<Npc>(`${basePath}/npcs`),
      sessions: this.loadFromManifest<Session>(`${basePath}/sessions`),
      maps: this.loadJson<ReadonlyArray<GameMap>>(`${basePath}/maps.json`),
      partyRelationships: this.loadJson<ReadonlyArray<Relationship>>(
        `${basePath}/party-relationships.json`,
      ),
      npcRelationships: this.loadJson<ReadonlyArray<Relationship>>(
        `${basePath}/npc-relationships.json`,
      ),
      campaign: this.loadJson<Campaign>(`${basePath}/campaign.json`),
    }).subscribe({
      next: (data) => {
        this._characters.set(resolveImagePaths(data.characters, imagesBase));
        this._npcs.set(resolveImagePaths(data.npcs, imagesBase));
        this._sessions.set(resolveImagePaths(data.sessions, imagesBase));
        this._maps.set(resolveImagePaths(data.maps, imagesBase));
        this._partyRelationships.set(data.partyRelationships);
        this._npcRelationships.set(data.npcRelationships);
        this._campaign.set(resolveImagePaths(data.campaign, imagesBase));
        this._state.set({ isLoading: false, isLoaded: true, error: undefined });
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load campaign data';
        this._state.set({ isLoading: false, isLoaded: false, error: message });
      },
    });
  }

  /**
   * Loads a single JSON file with error handling.
   * @param path - Relative path to the JSON asset.
   * @returns Observable of the parsed JSON data, or empty array on error.
   */
  private loadJson<T>(path: string): Observable<T> {
    return this.http.get<T>(path).pipe(catchError(() => of([] as unknown as T)));
  }

  /**
   * Loads individual entity JSON files from a manifest.
   * Reads `{folder}/manifest.json` (an array of filenames), then loads each file in parallel.
   * @param folder - The folder path (e.g. `assets/data/characters`).
   * @returns Observable of the combined array of entities.
   */
  private loadFromManifest<T>(folder: string): Observable<ReadonlyArray<T>> {
    return this.http.get<ReadonlyArray<string>>(`${folder}/manifest.json`).pipe(
      switchMap((filenames: ReadonlyArray<string>) => {
        if (filenames.length === 0) {
          return of([] as ReadonlyArray<T>);
        }
        const fileLoads: ReadonlyArray<Observable<T>> = filenames.map((filename: string) =>
          this.http.get<T>(`${folder}/${filename}`),
        );
        return forkJoin([...fileLoads]);
      }),
      catchError(() => of([] as ReadonlyArray<T>)),
    );
  }
}
