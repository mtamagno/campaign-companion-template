import { Directive, HostListener, inject, Input } from '@angular/core';

import { SFX, type SfxId } from '../constants/sfx.constant';
import { AudioService } from '../services/audio.service';

/**
 * Plays a click SFX on the host element.
 *
 * Usage:
 * ```html
 * <div [appSfxClick]>...</div>                  <!-- default: click-soft -->
 * <div [appSfxClick]="'success-chime'">...</div> <!-- override sound -->
 * ```
 *
 * Most buttons and anchors are already covered by the global delegated
 * click listener on the `App` root, so this directive is meant for
 * non-standard interactive elements or for overriding the default sound.
 *
 * The global listener detects the `[appSfxClick]` attribute and skips
 * those targets to avoid double-play.
 *
 * Honors `data-sfx="off"` on the host (silences this directive).
 */
@Directive({
  selector: '[appSfxClick]',
  standalone: true,
})
export class SfxClickDirective {
  private readonly audio = inject(AudioService);
  private readonly host = inject<HTMLElement>(HTMLElement, { optional: true });

  /**
   * Optional SFX id override. Bound as the directive's input value.
   * Defaults to `SFX.CLICK_SOFT` when empty or `undefined`.
   */
  @Input('appSfxClick') sfxId: SfxId | '' | undefined;

  constructor() {
    // Tag the host so the global delegated click listener (in `App`) can
    // detect this element and skip default playback to avoid double-play.
    this.host?.setAttribute('data-sfx-managed', 'true');
  }

  /**
   * Plays the configured sound when the host element is clicked.
   * No-op if the host (or the directive metadata) opts out via
   * `data-sfx="off"`.
   */
  @HostListener('click')
  onClick(): void {
    if (this.isOptedOut()) {
      return;
    }
    const id: SfxId = this.sfxId !== undefined && this.sfxId !== '' ? this.sfxId : SFX.CLICK_SOFT;
    this.audio.play(id);
  }

  /**
   * @returns true if the host carries `data-sfx="off"`.
   */
  private isOptedOut(): boolean {
    return this.host?.getAttribute('data-sfx') === 'off';
  }
}
