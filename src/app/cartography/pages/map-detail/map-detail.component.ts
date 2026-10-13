/**
 * Map detail page — full location view with image gallery and discoveries.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DataService } from '@guild/services/data.service';
import { type GameMap } from '@guild/models/map.model';
import { ImageGalleryComponent } from '@guild/components/image-gallery/image-gallery.component';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';

/**
 * Displays a single location's full detail: description, map images, discoveries list.
 */
@Component({
  selector: 'app-map-detail',
  standalone: true,
  imports: [ImageGalleryComponent, BilingualTextPipe, LanguageToggleComponent, DiceLoaderComponent],
  templateUrl: './map-detail.component.html',
  styleUrl: './map-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);

  /** Map ID from route params. */
  private readonly mapId: Signal<string | undefined> = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  /** The loaded map data. */
  readonly location: Signal<GameMap | undefined> = computed(() => {
    const id = this.mapId();
    if (id === undefined) {
      return undefined;
    }
    return this.dataService.getMapById(id)();
  });

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;
}
