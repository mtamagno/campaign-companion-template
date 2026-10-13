/**
 * Centralized campaign context service.
 * Reads the active campaign ID from the Angular route tree and exposes
 * reactive signals for the campaign's data and image base paths.
 * Also provides access to the global campaigns manifest.
 */

import {
  Injectable,
  inject,
  signal,
  computed,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';
import { type ActivatedRouteSnapshot } from '@angular/router';

import { type CampaignManifestEntry } from '@guild/models/campaignConfig.model';

const CAMPAIGNS_MANIFEST_PATH = 'campaigns/campaigns.json';

/**
 * Extracts the `campaignId` param from the deepest route snapshot that has it.
 * @param route - The root activated route snapshot.
 * @returns The campaign ID string, or undefined if not found.
 */
function extractCampaignId(route: ActivatedRouteSnapshot): string | undefined {
  let current: ActivatedRouteSnapshot | undefined = route;
  while (current !== undefined) {
    const id = current.paramMap.get('campaignId');
    if (id !== null) {
      return id;
    }
    current = current.children[0];
  }
  return undefined;
}

/**
 * Manages the active campaign context based on the current route.
 * Exposes computed paths for data and image loading, and provides
 * access to the campaigns manifest for the selector page.
 *
 * @example
 * ```typescript
 * private readonly campaignService = inject(CampaignService);
 * readonly dataPath = this.campaignService.dataBasePath;
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private readonly _activeCampaignId: WritableSignal<string | undefined> = signal(undefined);
  private readonly _manifest: WritableSignal<ReadonlyArray<CampaignManifestEntry>> = signal([]);
  private readonly _manifestLoaded: WritableSignal<boolean> = signal(false);

  /** The currently active campaign ID, or undefined if on the selector/compendium pages. */
  readonly activeCampaignId: Signal<string | undefined> = this._activeCampaignId.asReadonly();

  /** Whether a campaign is currently active. */
  readonly hasCampaign: Signal<boolean> = computed(() => this._activeCampaignId() !== undefined);

  /** Base path for loading campaign data files (e.g., `campaigns/example-campaign/data`). */
  readonly dataBasePath: Signal<string | undefined> = computed(() => {
    const id = this._activeCampaignId();
    return id !== undefined ? `campaigns/${id}/data` : undefined;
  });

  /** Base path for resolving campaign image URLs (e.g., `campaigns/example-campaign/images`). */
  readonly imagesBasePath: Signal<string | undefined> = computed(() => {
    const id = this._activeCampaignId();
    return id !== undefined ? `campaigns/${id}/images` : undefined;
  });

  /** All available campaigns from the manifest. */
  readonly manifest: Signal<ReadonlyArray<CampaignManifestEntry>> = this._manifest.asReadonly();

  /** Whether the manifest has been loaded. */
  readonly manifestLoaded: Signal<boolean> = this._manifestLoaded.asReadonly();

  constructor() {
    this.listenToRouteChanges();
    this.loadManifest();
  }

  /**
   * Subscribes to router navigation events and extracts the campaign ID
   * from the activated route tree on every navigation.
   */
  private listenToRouteChanges(): void {
    // Extract from initial navigation
    this.updateCampaignIdFromRoute();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCampaignIdFromRoute();
      });
  }

  /** Reads the current route tree and updates the active campaign ID signal. */
  private updateCampaignIdFromRoute(): void {
    const root = this.router.routerState.snapshot.root;
    const campaignId = extractCampaignId(root);
    this._activeCampaignId.set(campaignId);
  }

  /** Loads the global campaigns manifest from the assets. */
  private loadManifest(): void {
    this.http.get<ReadonlyArray<CampaignManifestEntry>>(CAMPAIGNS_MANIFEST_PATH).subscribe({
      next: (entries) => {
        this._manifest.set(entries);
        this._manifestLoaded.set(true);
      },
      error: () => {
        this._manifest.set([]);
        this._manifestLoaded.set(true);
      },
    });
  }
}
