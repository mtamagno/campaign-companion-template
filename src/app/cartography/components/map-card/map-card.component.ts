/**
 * Map card component — shows a location preview in the maps grid.
 * Links to the full map detail page.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  computed,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { type GameMap } from '@guild/models/map.model';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { SfxHoverDirective } from '@guild/directives/sfxHover.directive';
import { CampaignService } from '@guild/services/campaign.service';

/**
 * Displays a map location card with preview image, name, region, and exploration status.
 */
@Component({
  selector: 'app-map-card',
  standalone: true,
  imports: [RouterLink, BilingualTextPipe, SfxHoverDirective],
  templateUrl: './map-card.component.html',
  styleUrl: './map-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapCardComponent {
  private readonly campaignService = inject(CampaignService);

  /** Active campaign ID for building route links. */
  readonly campaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** The map/location data. */
  readonly map: InputSignal<GameMap> = input.required<GameMap>();

  /** The first image URL or empty string. */
  readonly previewUrl: Signal<string> = computed(() => {
    const images = this.map().images;
    return images.length > 0 ? images[0].url : '';
  });

  /** Number of discoveries at this location. */
  readonly discoveryCount: Signal<number> = computed(() => this.map().discoveries.length);
}
