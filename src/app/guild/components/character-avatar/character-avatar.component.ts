/**
 * Reusable character avatar component.
 * Displays a square avatar with ornamental border.
 * Falls back to colored initials when image is not available.
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  type WritableSignal,
  type Signal,
} from '@angular/core';

/** Available avatar size presets. */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Square avatar with fantasy ornamental border.
 * Shows the image if available, or colored initials as fallback.
 *
 * @example
 * ```html
 * <app-character-avatar
 *   [imageUrl]="character().avatar.url"
 *   [name]="character().name"
 *   size="lg" />
 * ```
 */
@Component({
  selector: 'app-character-avatar',
  standalone: true,
  imports: [],
  templateUrl: './character-avatar.component.html',
  styleUrl: './character-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterAvatarComponent {
  /** URL of the avatar image. */
  readonly imageUrl = input.required<string>();

  /** Character name — used for alt text and initials fallback. */
  readonly name = input.required<string>();

  /** Size preset: sm (36px), md (64px), lg (120px), xl (180px). */
  readonly size = input<AvatarSize>('md');

  /** Whether the image failed to load (triggers initials fallback). */
  readonly hasImageError: WritableSignal<boolean> = signal(false);

  /** Up to 2 uppercase initials extracted from the name. */
  readonly initials: Signal<string> = computed(() =>
    this.name()
      .split(' ')
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join(''),
  );

  /** CSS class based on the size input. */
  readonly sizeClass: Signal<string> = computed(() => `avatar--${this.size()}`);

  /** Handles image load errors by switching to initials fallback. */
  onImageError(): void {
    this.hasImageError.set(true);
  }
}
