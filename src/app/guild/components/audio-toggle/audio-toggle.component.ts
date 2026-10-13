/**
 * Audio toggle component for the sidebar.
 * Shows a speaker button (🔊 / 🔇) that toggles mute, plus a slim
 * volume slider. Both controls are bound to {@link UserPreferencesService}
 * via signals; persistence is automatic.
 */

import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';

import { LanguageService } from '@guild/services/language.service';
import { AudioService } from '@guild/services/audio.service';
import { UserPreferencesService } from '@guild/services/userPreferences.service';
import { SFX } from '@guild/constants/sfx.constant';

@Component({
  selector: 'app-audio-toggle',
  standalone: true,
  imports: [],
  templateUrl: './audio-toggle.component.html',
  styleUrl: './audio-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudioToggleComponent {
  private readonly preferences = inject(UserPreferencesService);
  private readonly audio = inject(AudioService);
  private readonly languageService = inject(LanguageService);

  /** Whether sound effects are currently muted. */
  readonly isMuted: Signal<boolean> = this.preferences.audioMuted;

  /** Current playback volume in [0, 1]. */
  readonly volume: Signal<number> = this.preferences.audioVolume;

  /** Whether the UI label set should be Italian. */
  readonly isItalian: Signal<boolean> = this.languageService.isItalian;

  /** Toggles mute. Plays a confirmation click only when un-muting. */
  toggleMute(): void {
    const wasMuted = this.preferences.audioMuted();
    this.preferences.toggleMuted();
    if (wasMuted) {
      this.audio.play(SFX.CLICK_SOFT, { ignoreThrottle: true });
    }
  }

  /**
   * Handles input from the volume slider.
   * @param event - Input event from the range element.
   */
  onVolumeInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const next = Number.parseFloat(target.value);
    this.preferences.setVolume(next);
  }

  /**
   * Plays a click sound when the user finishes adjusting the slider,
   * giving immediate audible feedback at the new volume level.
   */
  onVolumeCommit(): void {
    if (this.preferences.audioMuted()) {
      return;
    }
    this.audio.play(SFX.CLICK_SOFT, { ignoreThrottle: true });
  }
}
