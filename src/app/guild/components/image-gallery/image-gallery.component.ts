/**
 * Reusable image gallery component.
 * Displays images in a responsive grid. Clicking a thumbnail opens the lightbox.
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  type WritableSignal,
} from '@angular/core';

import { type ImageRef } from '@guild/models/character.model';
import { toThumbUrl } from '@guild/services/imageUrl.service';
import { ImageLightboxComponent } from '../image-lightbox/image-lightbox.component';

/**
 * Grid gallery that accepts an array of images and renders responsive thumbnails.
 * Integrates with ImageLightboxComponent for fullscreen viewing.
 *
 * @example
 * ```html
 * <app-image-gallery [images]="character().gallery" />
 * ```
 */
@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [ImageLightboxComponent],
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageGalleryComponent {
  /** Array of images to display in the gallery grid. */
  readonly images = input.required<ReadonlyArray<ImageRef>>();

  /** Optional title shown above the gallery. */
  readonly galleryTitle = input<string>('');

  /** Index of the currently selected image for lightbox. -1 means closed. */
  readonly selectedIndex: WritableSignal<number> = signal(-1);

  /** Whether the lightbox is currently open. */
  get isLightboxOpen(): boolean {
    return this.selectedIndex() >= 0;
  }

  /**
   * Opens the lightbox at the given image index.
   * @param index - The index of the clicked thumbnail.
   */
  openLightbox(index: number): void {
    this.selectedIndex.set(index);
  }

  /** Closes the lightbox. */
  closeLightbox(): void {
    this.selectedIndex.set(-1);
  }

  /**
   * Navigates to a different image in the lightbox.
   * @param index - The new image index to display.
   */
  navigateTo(index: number): void {
    const total = this.images().length;
    if (total > 0) {
      this.selectedIndex.set(((index % total) + total) % total);
    }
  }

  /** Resolves the lightweight image used by the gallery grid. */
  thumbnailUrl(imageUrl: string): string {
    return toThumbUrl(imageUrl);
  }

  /** Falls back to the original asset when a generated thumbnail is unavailable. */
  onThumbnailError(event: Event, originalUrl: string): void {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.dataset['fallbackApplied'] !== 'true') {
      image.dataset['fallbackApplied'] = 'true';
      image.src = originalUrl;
    }
  }
}
