/**
 * Centralized sound-effect playback. Preloads a small pool of
 * {@link HTMLAudioElement} instances per sound, throttles repeated plays,
 * unlocks audio on first user gesture, and respects user preferences
 * managed by {@link UserPreferencesService}.
 *
 * Phase B will consume this service through directives (`appSfxClick`,
 * `appSfxHover`); during Phase A no UI element wires it up yet.
 */

import { Injectable, inject } from '@angular/core';

import {
  SFX_ASSET_PATHS,
  SFX_EVENT_TO_ID,
  type SfxEvent,
  type SfxId,
} from '../constants/sfx.constant';
import { UserPreferencesService } from './userPreferences.service';

/** Minimum gap between two plays of the same sound id, in milliseconds. */
const HOVER_THROTTLE_MS = 150;

/** Number of concurrent audio elements per sound, allowing overlap. */
const POOL_SIZE = 3;

/** Optional knobs for {@link AudioService.play}. */
interface PlayOptions {
  /** Bypass the per-id throttle (e.g., for thematic event triggers). */
  readonly ignoreThrottle?: boolean;
}

/**
 * Builds a pool of preloaded audio elements for a single sound.
 * @param url - Public asset URL of the sound.
 * @param volume - Initial playback volume in [0, 1].
 * @returns Array of {@link HTMLAudioElement} ready to play.
 */
function createPool(url: string, volume: number): readonly HTMLAudioElement[] {
  const pool: HTMLAudioElement[] = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = volume;
    pool.push(audio);
  }
  return pool;
}

/**
 * Detects whether the current device has no hover capability and uses a
 * coarse pointer (typical for touchscreens). Used by the hover directive
 * in Phase B to suppress hover SFX, but exposed here for reuse.
 * @returns `true` on touch-only devices.
 */
function detectTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/**
 * Plays UI sound effects with mute/volume awareness, throttling,
 * and autoplay-policy unlocking.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly preferences = inject(UserPreferencesService);
  private readonly pools = new Map<SfxId, readonly HTMLAudioElement[]>();
  private readonly lastPlayedAt = new Map<SfxId, number>();
  private isUnlocked = false;
  private readonly touchDevice = detectTouchDevice();

  constructor() {
    this.preloadAllPools();
    this.registerUnlockListener();
  }

  /**
   * Plays the given sound effect, honoring mute, volume, throttle,
   * and the autoplay-policy unlock state.
   * @param id - The sound effect to play.
   * @param options - Optional playback overrides.
   */
  play(id: SfxId, options: PlayOptions = {}): void {
    if (!this.isUnlocked) {
      return;
    }
    if (this.preferences.audioMuted()) {
      return;
    }
    if (!options.ignoreThrottle && this.isThrottled(id)) {
      return;
    }
    this.lastPlayedAt.set(id, performance.now());
    const pool = this.pools.get(id);
    if (pool === undefined) {
      return;
    }
    const audio = this.pickAvailable(pool);
    audio.volume = this.preferences.audioVolume();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers may reject .play() until a user gesture has been registered.
      // We swallow the error — the next play attempt after unlock will succeed.
    });
  }

  /**
   * Plays a thematic event sound (success, error, level-up, page-turn)
   * without throttling, since these are deliberate, low-frequency cues.
   * @param event - Logical event name.
   */
  playEvent(event: SfxEvent): void {
    this.play(SFX_EVENT_TO_ID[event], { ignoreThrottle: true });
  }

  /**
   * Indicates whether the current device should suppress hover-driven SFX.
   * @returns `true` if the device is touch-only (no hover, coarse pointer).
   */
  isTouchDevice(): boolean {
    return this.touchDevice;
  }

  /**
   * Preloads one pool of audio elements per registered SFX id.
   * Runs once on service construction.
   */
  private preloadAllPools(): void {
    const initialVolume = this.preferences.audioVolume();
    for (const [idKey, url] of Object.entries(SFX_ASSET_PATHS)) {
      const id = idKey as SfxId;
      this.pools.set(id, createPool(url, initialVolume));
    }
  }

  /**
   * Registers a one-shot listener that unlocks audio playback on the
   * first user gesture, complying with browser autoplay policies.
   */
  private registerUnlockListener(): void {
    if (typeof window === 'undefined') {
      this.isUnlocked = true;
      return;
    }
    const unlock = (): void => {
      this.isUnlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  /**
   * Returns true when the same sound was played less than
   * {@link HOVER_THROTTLE_MS} ago.
   * @param id - The sound effect id to check.
   */
  private isThrottled(id: SfxId): boolean {
    const last = this.lastPlayedAt.get(id);
    if (last === undefined) {
      return false;
    }
    return performance.now() - last < HOVER_THROTTLE_MS;
  }

  /**
   * Picks the first audio element in the pool that isn't currently
   * playing, falling back to the first slot if all are busy.
   * @param pool - Pool of preloaded audio instances.
   * @returns A playable audio element.
   */
  private pickAvailable(pool: readonly HTMLAudioElement[]): HTMLAudioElement {
    for (const audio of pool) {
      if (audio.paused || audio.ended) {
        return audio;
      }
    }
    return pool[0];
  }
}
