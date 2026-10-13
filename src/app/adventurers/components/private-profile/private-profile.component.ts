/**
 * Private profile section — password-protected character secrets.
 * Shows a lock overlay until password is provided.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  computed,
  type Signal,
  type WritableSignal,
} from '@angular/core';

import { PasswordService } from '@guild/services/password.service';
import { type CharacterPrivateProfile } from '@guild/models/character.model';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { PasswordDialogComponent } from '@guild/components/password-dialog/password-dialog.component';

/**
 * Displays private character profile behind password protection.
 * Uses PasswordService to track unlock state across page navigations.
 */
@Component({
  selector: 'app-private-profile',
  standalone: true,
  imports: [BilingualTextPipe, PasswordDialogComponent],
  templateUrl: './private-profile.component.html',
  styleUrl: './private-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateProfileComponent {
  private readonly passwordService = inject(PasswordService);

  /** Character ID for password state tracking. */
  readonly characterId = input.required<string>();

  /** Character name for dialog display. */
  readonly characterName = input.required<string>();

  /** The private profile data to display when unlocked. */
  readonly privateProfile = input.required<CharacterPrivateProfile>();

  /** The stored password to verify against. */
  readonly password = input.required<string>();

  /** Whether the password dialog is currently open. */
  readonly isDialogOpen: WritableSignal<boolean> = signal(false);

  /** Whether the last password attempt was incorrect. */
  readonly hasPasswordError: WritableSignal<boolean> = signal(false);

  /** Whether this character's private section is unlocked. */
  readonly isUnlocked: Signal<boolean> = computed(() =>
    this.passwordService.isUnlocked(this.characterId())(),
  );

  /** Opens the password dialog. */
  openDialog(): void {
    this.hasPasswordError.set(false);
    this.isDialogOpen.set(true);
  }

  /** Closes the password dialog. */
  closeDialog(): void {
    this.isDialogOpen.set(false);
    this.hasPasswordError.set(false);
  }

  /**
   * Attempts to unlock with the provided password.
   * @param inputPassword - The password entered by the user.
   */
  onPasswordSubmit(inputPassword: string): void {
    const success = this.passwordService.unlock(this.characterId(), inputPassword, this.password());

    if (success) {
      this.isDialogOpen.set(false);
      this.hasPasswordError.set(false);
    } else {
      this.hasPasswordError.set(true);
    }
  }

  /** Locks the profile again. */
  lockProfile(): void {
    this.passwordService.lock(this.characterId());
  }
}
