/**
 * NPC list page — shows all NPCs grouped by allegiance and category.
 * Each allegiance section is an accordion; within each, NPCs are sub-grouped by category.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DataService } from '@guild/services/data.service';
import { CampaignService } from '@guild/services/campaign.service';
import { LanguageService } from '@guild/services/language.service';
import { type Npc, type NpcAllegiance } from '@guild/models/npc.model';
import { AccordionComponent } from '@guild/components/accordion/accordion.component';
import { SfxHoverDirective } from '@guild/directives/sfxHover.directive';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { toThumbUrl } from '@guild/services/imageUrl.service';
import { getNpcDisplayName } from '@guild/utils/npcDisplay';
import { type SupportedLanguage } from '@guild/models/language.model';

/** Placeholder portrait shown when an NPC has no profile image. */
const PLACEHOLDER_PORTRAIT_URL = 'assets/images/placeholders/placeholder-portrait.svg';

/** A category sub-group within an allegiance section. */
interface NpcCategoryGroup {
  readonly category: string;
  readonly npcs: ReadonlyArray<Npc>;
}

/** An allegiance section containing category sub-groups. */
interface NpcAllegianceGroup {
  readonly allegiance: NpcAllegiance;
  readonly label: string;
  readonly icon: string;
  readonly categories: ReadonlyArray<NpcCategoryGroup>;
}

/** Display order for allegiance groups. */
const ALLEGIANCE_ORDER: ReadonlyArray<{
  allegiance: NpcAllegiance;
  label: { readonly en: string; readonly it: string };
  icon: string;
}> = [
  { allegiance: 'ally', label: { en: 'Allies', it: 'Alleati' }, icon: '🛡️' },
  { allegiance: 'enemy', label: { en: 'Enemies', it: 'Nemici' }, icon: '⚔️' },
  { allegiance: 'neutral', label: { en: 'Neutral', it: 'Neutrali' }, icon: '🤝' },
];

/**
 * Groups NPCs by allegiance and then by category.
 * @param npcs - The full NPC list.
 * @returns Ordered allegiance groups, each containing sorted category sub-groups.
 */
function groupNpcsByAllegianceAndCategory(
  npcs: ReadonlyArray<Npc>,
  lang: SupportedLanguage,
): ReadonlyArray<NpcAllegianceGroup> {
  return ALLEGIANCE_ORDER.map(({ allegiance, label, icon }) => {
    const matching = npcs.filter((npc) => npc.allegiance === allegiance);

    const categoryMap = new Map<string, Array<Npc>>();
    for (const npc of matching) {
      const cat = npc.category ?? 'Other';
      const existing = categoryMap.get(cat);
      if (existing !== undefined) {
        existing.push(npc);
      } else {
        categoryMap.set(cat, [npc]);
      }
    }

    const categories: ReadonlyArray<NpcCategoryGroup> = [...categoryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryNpcs]) => ({
        category,
        npcs: categoryNpcs.sort((a, b) =>
          getNpcDisplayName(a, lang).localeCompare(getNpcDisplayName(b, lang)),
        ),
      }));

    return { allegiance, label: label[lang === 'it' ? 'it' : 'en'], icon, categories };
  }).filter((group) => group.categories.length > 0);
}

/**
 * Displays all NPCs grouped by allegiance (Allies / Enemies / Neutral),
 * with category sub-groups inside each section.
 */
@Component({
  selector: 'app-npc-list',
  standalone: true,
  imports: [RouterLink, AccordionComponent, SfxHoverDirective, DiceLoaderComponent],
  templateUrl: './npc-list.component.html',
  styleUrl: './npc-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpcListComponent {
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for page labels. */
  readonly lang = this.languageService.currentLanguage;

  /** Active campaign ID for building route links. */
  readonly campaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** NPCs grouped by allegiance → category. */
  readonly allegianceGroups: Signal<ReadonlyArray<NpcAllegianceGroup>> = computed(() =>
    groupNpcsByAllegianceAndCategory(this.dataService.npcs(), this.lang()),
  );

  /**
   * Resolves the thumbnail URL to display on an NPC card.
   * Prefers the dedicated profile image (as a thumbnail) over the legacy
   * avatar field, which in older data points to placeholder SVGs.
   * @param npc - The NPC to render.
   * @returns A URL suitable for the `<img>` `src` attribute.
   */
  resolveCardPortraitUrl(npc: Npc): string {
    if (npc.profileImageUrl !== undefined) {
      return toThumbUrl(npc.profileImageUrl);
    }
    if (npc.avatar.url.length > 0) {
      return npc.avatar.url;
    }
    return PLACEHOLDER_PORTRAIT_URL;
  }

  /**
   * Replaces a broken portrait with the shared placeholder.
   * @param event - The img error event.
   */
  onPortraitError(event: Event): void {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) {
      return;
    }
    if (img.src.endsWith(PLACEHOLDER_PORTRAIT_URL)) {
      return;
    }
    img.src = PLACEHOLDER_PORTRAIT_URL;
  }
}
