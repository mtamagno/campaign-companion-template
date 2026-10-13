import { Directive, HostListener, inject } from '@angular/core';

import { SFX } from '../constants/sfx.constant';
import { AudioService } from '../services/audio.service';

/**
 * Plays a soft hover SFX (`SFX.HOVER_SHIMMER`) when the pointer enters
 * the host element. Opt-in only: hover sounds must never be applied
 * globally to avoid noise on dense pages.
 *
 * No-op on touch-only devices and when audio is muted (mute is enforced
 * inside `AudioService.play`). Throttling (150 ms per id) is also handled
 * by the service.
 *
 * Usage:
 * ```html
 * <article class="character-card" appSfxHover>...</article>
 * ```
 */
@Directive({
  selector: '[appSfxHover]',
  standalone: true,
})
export class SfxHoverDirective {
  private readonly audio = inject(AudioService);

  /**
   * Plays the hover sound on `mouseenter`. Skipped on touch devices
   * to avoid spurious triggers from synthetic mouse events.
   */
  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.audio.isTouchDevice()) {
      return;
    }
    this.audio.play(SFX.HOVER_SHIMMER);
  }
}
