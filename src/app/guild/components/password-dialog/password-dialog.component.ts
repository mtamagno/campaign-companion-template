/**
 * Password dialog component for unlocking private character sections.
 * Displays a fantasy-themed modal overlay with password input.
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  type WritableSignal,
} from '@angular/core';

/**
 * Reusable password dialog with fantasy styling.
 * Emits the entered password for the parent to verify.
 *
 * @example
 * ```html
 * <app-password-dialog
 *   [characterName]="character().name"
 *   (passwordSubmit)="onPasswordSubmit($event)"
 *   (dialogClose)="onDialogClose()" />
 * ```
 */
@Component({
  selector: 'app-password-dialog',
  standalone: true,
  imports: [],
  templateUrl: './password-dialog.component.html',
  styleUrl: './password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordDialogComponent {
  /** Name of the character being unlocked — shown in the dialog header. */
  readonly characterName = input.required<string>();

  /** Whether to show an error message for wrong password. */
  readonly hasError = input<boolean>(false);

  /** Emitted when the user submits a password. */
  readonly passwordSubmit = output<string>();

  /** Emitted when the user closes the dialog without submitting. */
  readonly dialogClose = output<void>();

  /** Current password input value. */
  readonly passwordValue: WritableSignal<string> = signal('');

  /** Whether the password text is visible (toggle). */
  readonly isPasswordVisible: WritableSignal<boolean> = signal(false);

  /**
   * Handles form submission.
   * Emits the password if non-empty.
   */
  onSubmit(): void {
    const value = this.passwordValue().trim();
    if (value.length > 0) {
      this.passwordSubmit.emit(value);
    }
  }

  /**
   * Updates the password signal from input events.
   * @param event - The input DOM event.
   */
  onPasswordInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.passwordValue.set(target.value);
    }
  }

  /** Toggles password text visibility. */
  toggleVisibility(): void {
    this.isPasswordVisible.update((v) => !v);
  }

  /**
   * Closes the dialog when clicking the backdrop overlay.
   * Ignores clicks on the dialog content itself.
   * @param event - The click DOM event.
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.dialogClose.emit();
    }
  }

  /**
   * Handles keyboard events for accessibility.
   * Escape closes the dialog.
   * @param event - The keyboard DOM event.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.dialogClose.emit();
    }
  }
}
