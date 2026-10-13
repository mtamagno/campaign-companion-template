/**
 * Fullscreen image lightbox component.
 * Displays a single image with prev/next navigation and keyboard support.
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  type Signal,
  HostListener,
} from '@angular/core';

import { type ImageRef } from '@guild/models/character.model';

/**
 * Fullscreen overlay lightbox for viewing images at full resolution.
 * Supports keyboard navigation (arrow keys, Escape) and prev/next buttons.
 *
 * @example
 * ```html
 * <app-image-lightbox
 *   [images]="gallery"
 *   [currentIndex]="selectedIdx"
 *   (indexChange)="onNavigate($event)"
 *   (lightboxClose)="onClose()" />
 * ```
 */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [],
  templateUrl: './image-lightbox.component.html',
  styleUrl: './image-lightbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageLightboxComponent {
  /** All images in the gallery. */
  readonly images = input.required<ReadonlyArray<ImageRef>>();

  /** Index of the currently displayed image. */
  readonly currentIndex = input.required<number>();

  /** Emitted when navigating to a different image. */
  readonly indexChange = output<number>();

  /** Emitted when the lightbox should close. */
  readonly lightboxClose = output<void>();

  /** The currently displayed image. */
  readonly currentImage: Signal<ImageRef | undefined> = computed(() => {
    const imgs = this.images();
    const idx = this.currentIndex();
    return imgs[idx];
  });

  /** Whether there is a previous image to navigate to. */
  readonly hasPrevious: Signal<boolean> = computed(() => this.currentIndex() > 0);

  /** Whether there is a next image to navigate to. */
  readonly hasNext: Signal<boolean> = computed(
    () => this.currentIndex() < this.images().length - 1,
  );

  /** Display string showing current position (e.g. "2 / 5"). */
  readonly positionLabel: Signal<string> = computed(
    () => `${this.currentIndex() + 1} / ${this.images().length}`,
  );

  /** Navigates to the previous image. */
  goToPrevious(): void {
    if (this.hasPrevious()) {
      this.indexChange.emit(this.currentIndex() - 1);
    }
  }

  /** Navigates to the next image. */
  goToNext(): void {
    if (this.hasNext()) {
      this.indexChange.emit(this.currentIndex() + 1);
    }
  }

  /**
   * Handles backdrop clicks — closes lightbox when clicking outside the image.
   * @param event - The click DOM event.
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.lightboxClose.emit();
    }
  }

  /**
   * Keyboard navigation handler.
   * @param event - The keyboard event.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.lightboxClose.emit();
        break;
      case 'ArrowLeft':
        this.goToPrevious();
        break;
      case 'ArrowRight':
        this.goToNext();
        break;
    }
  }
}
