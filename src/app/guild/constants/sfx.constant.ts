/**
 * Sound effect identifiers used throughout the application.
 *
 * Single source of truth for SFX names and asset paths. Adding a new sound
 * requires (1) dropping the OGG file into `src/assets/audio/sfx/` and
 * (2) appending an entry here.
 */

export const SFX = {
  CLICK_SOFT: 'click-soft',
  HOVER_SHIMMER: 'hover-shimmer',
  SUCCESS_CHIME: 'success-chime',
  ERROR_THUD: 'error-thud',
  LEVELUP_FANFARE: 'levelup-fanfare',
  PAGE_TURN: 'page-turn',
  DICE_ROLL: 'dice-roll',
} as const;

export type SfxId = (typeof SFX)[keyof typeof SFX];

/**
 * Maps each SFX id to its public asset URL. Angular's build serves
 * `src/assets/` at `/assets/`, so these paths work at runtime as-is.
 */
export const SFX_ASSET_PATHS: Readonly<Record<SfxId, string>> = {
  [SFX.CLICK_SOFT]: 'assets/audio/sfx/click-soft.ogg',
  [SFX.HOVER_SHIMMER]: 'assets/audio/sfx/hover-shimmer.ogg',
  [SFX.SUCCESS_CHIME]: 'assets/audio/sfx/success-chime.ogg',
  [SFX.ERROR_THUD]: 'assets/audio/sfx/error-thud.ogg',
  [SFX.LEVELUP_FANFARE]: 'assets/audio/sfx/levelup-fanfare.ogg',
  [SFX.PAGE_TURN]: 'assets/audio/sfx/page-turn.ogg',
  [SFX.DICE_ROLL]: 'assets/audio/sfx/dice-roll.ogg',
} as const;

/**
 * Thematic event names that map to a specific SFX. Used by
 * `AudioService.playEvent()` so callers don't reference raw SFX ids
 * for high-level feedback (success/error/level-up/page-turn).
 */
export const SFX_EVENT = {
  SUCCESS: 'success',
  ERROR: 'error',
  LEVELUP: 'levelup',
  PAGE_TURN: 'page-turn',
} as const;

export type SfxEvent = (typeof SFX_EVENT)[keyof typeof SFX_EVENT];

export const SFX_EVENT_TO_ID: Readonly<Record<SfxEvent, SfxId>> = {
  [SFX_EVENT.SUCCESS]: SFX.SUCCESS_CHIME,
  [SFX_EVENT.ERROR]: SFX.ERROR_THUD,
  [SFX_EVENT.LEVELUP]: SFX.LEVELUP_FANFARE,
  [SFX_EVENT.PAGE_TURN]: SFX.PAGE_TURN,
} as const;
