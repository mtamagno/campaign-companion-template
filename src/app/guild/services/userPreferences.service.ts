/**
 * Manages user-facing UI preferences with reactive signals
 * and localStorage persistence.
 *
 * Currently scoped to audio (mute, volume) and a derived flag for
 * `prefers-reduced-motion`. Designed to be extended with additional
 * preferences (theme, density, etc.) without breaking the public API.
 */

import { Injectable, computed, effect, signal, type Signal } from '@angular/core';

/** localStorage key under which preferences are persisted. */
const STORAGE_KEY = 'campaign-companion:audio:prefs';

/** Default audio volume on first load, in the inclusive range [0, 1]. */
const DEFAULT_VOLUME = 0.5;

/** Hard bounds on the volume signal. */
const MIN_VOLUME = 0;
const MAX_VOLUME = 1;

/** Shape of the JSON blob persisted in localStorage. */
interface StoredPreferences {
  readonly muted: boolean;
  readonly volume: number;
}

/**
 * Type guard that validates an unknown payload retrieved from localStorage.
 * Rejects anything that doesn't strictly match {@link StoredPreferences}.
 * @param value - The unknown value to validate.
 * @returns `true` if `value` is a valid {@link StoredPreferences}.
 */
function isStoredPreferences(value: unknown): value is StoredPreferences {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['muted'] === 'boolean' &&
    typeof candidate['volume'] === 'number' &&
    Number.isFinite(candidate['volume'])
  );
}

/**
 * Clamps a numeric value into the valid volume range.
 * @param value - Raw number, possibly out of range.
 * @returns Number in [{@link MIN_VOLUME}, {@link MAX_VOLUME}].
 */
function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, value));
}

/**
 * Reads stored preferences from localStorage, returning sensible defaults
 * if storage is unavailable or contains malformed data.
 * @returns The hydrated preferences (defaults applied where needed).
 */
function readFromStorage(): StoredPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { muted: false, volume: DEFAULT_VOLUME };
    }
    const parsed: unknown = JSON.parse(raw);
    if (isStoredPreferences(parsed)) {
      return { muted: parsed.muted, volume: clampVolume(parsed.volume) };
    }
  } catch {
    // localStorage may throw in private mode or when JSON is malformed.
    // Fall through to defaults — the service stays functional in-memory.
  }
  return { muted: false, volume: DEFAULT_VOLUME };
}

/**
 * Persists the given preferences to localStorage. Silently swallows
 * errors (e.g., quota exceeded, private mode) so the UI never breaks.
 * @param prefs - Preferences to write.
 */
function writeToStorage(prefs: StoredPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Intentionally ignored — see readFromStorage.
  }
}

/**
 * Reactive store for user UI preferences. Exposes signals so any
 * component or service can react to changes without manual subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly mutedSignal;
  private readonly volumeSignal;
  private readonly reducedMotionSignal = signal<boolean>(false);

  /** Whether sound effects are muted. Reactive. */
  readonly audioMuted: Signal<boolean>;

  /** Current audio volume in [0, 1]. Reactive. */
  readonly audioVolume: Signal<number>;

  /** Live `prefers-reduced-motion` user preference. Reactive. */
  readonly prefersReducedMotion = computed<boolean>(() => this.reducedMotionSignal());

  constructor() {
    const initial = readFromStorage();
    this.mutedSignal = signal<boolean>(initial.muted);
    this.volumeSignal = signal<number>(initial.volume);
    this.audioMuted = this.mutedSignal.asReadonly();
    this.audioVolume = this.volumeSignal.asReadonly();

    this.subscribeToReducedMotion();

    // Persist any change to localStorage. Effect runs eagerly with the
    // initial values, which is harmless (writes the same data back).
    effect(() => {
      writeToStorage({
        muted: this.mutedSignal(),
        volume: this.volumeSignal(),
      });
    });
  }

  /**
   * Sets the muted state explicitly.
   * @param muted - `true` to silence all sound effects.
   */
  setMuted(muted: boolean): void {
    this.mutedSignal.set(muted);
  }

  /** Toggles the muted state. */
  toggleMuted(): void {
    this.mutedSignal.update((current) => !current);
  }

  /**
   * Sets the audio volume, clamping out-of-range input.
   * @param volume - Desired volume; will be clamped to [0, 1].
   */
  setVolume(volume: number): void {
    this.volumeSignal.set(clampVolume(volume));
  }

  /**
   * Wires up a live `matchMedia` listener for the reduced-motion preference.
   * Falls back gracefully when `matchMedia` is unavailable (SSR/tests).
   */
  private subscribeToReducedMotion(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotionSignal.set(query.matches);
    query.addEventListener('change', (event) => {
      this.reducedMotionSignal.set(event.matches);
    });
  }
}
