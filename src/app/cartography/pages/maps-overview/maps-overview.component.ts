/**
 * Maps overview page — grid of location cards linking to detail pages.
 */

import { Component, ChangeDetectionStrategy, inject, type Signal } from '@angular/core';

import { DataService } from '@guild/services/data.service';
import { LanguageService } from '@guild/services/language.service';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { type GameMap } from '@guild/models/map.model';
import { MapCardComponent } from '../../components/map-card/map-card.component';

/**
 * Displays all visited locations as a responsive card grid.
 * Each card links to the map detail page.
 */
@Component({
  selector: 'app-maps-overview',
  standalone: true,
  imports: [MapCardComponent, DiceLoaderComponent],
  templateUrl: './maps-overview.component.html',
  styleUrl: './maps-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapsOverviewComponent {
  private readonly dataService = inject(DataService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for page copy. */
  readonly lang = this.languageService.currentLanguage;

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** All map locations. */
  readonly maps: Signal<ReadonlyArray<GameMap>> = this.dataService.maps;
}
