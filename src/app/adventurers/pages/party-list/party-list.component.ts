/**
 * Party list page — showcase of all player characters in the active campaign.
 * Displays character cards with profile images, quick stats, quotes,
 * and navigation links to profile, diary, and relationships.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DataService } from '@guild/services/data.service';
import { CampaignService } from '@guild/services/campaign.service';
import { LanguageService } from '@guild/services/language.service';
import { type Character, type CharacterQuote } from '@guild/models/character.model';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { SfxHoverDirective } from '@guild/directives/sfxHover.directive';
import { localizeText, type SupportedLanguage } from '@guild/models/language.model';

/** Character card display data with a pre-picked random quote. */
interface CharacterShowcase {
  readonly character: Character;
  readonly quote: ResolvedQuote | undefined;
  readonly isReady: boolean;
}

/** A quote resolved to the current language. */
interface ResolvedQuote {
  readonly text: string;
  readonly context: string;
}

/**
 * Picks a random element from a readonly array.
 * @param items - The array to pick from.
 * @returns A random element, or undefined if the array is empty.
 */
function pickRandom<T>(items: ReadonlyArray<T>): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Builds showcase data for each character, including a random quote.
 * @param characters - All player characters.
 * @param lang - Current campaign language code.
 * @returns Array of character showcase objects.
 */
function buildShowcases(
  characters: ReadonlyArray<Character>,
  lang: SupportedLanguage,
): ReadonlyArray<CharacterShowcase> {
  return characters.map((character): CharacterShowcase => {
    const rawQuote: CharacterQuote | undefined = pickRandom(character.quotes);
    const quote: ResolvedQuote | undefined =
      rawQuote !== undefined
        ? {
            text: localizeText(rawQuote.text, lang),
            context: localizeText(rawQuote.context, lang),
          }
        : undefined;

    const isReady =
      character.sheet.level > 0 &&
      character.sheet.maxHitPoints > 0 &&
      character.sheet.armorClass > 0 &&
      !character.sheet.classType.toLowerCase().includes('to be confirmed') &&
      !character.sheet.race.toLowerCase().includes('to be confirmed');

    return { character, quote, isReady };
  });
}

/**
 * Party overview page — displays all player characters as rich showcase cards.
 * Each card features the character's profile image, stats, an iconic quote,
 * and quick links to their profile, diary, and party relationships.
 */
@Component({
  selector: 'app-party-list',
  standalone: true,
  imports: [RouterLink, LanguageToggleComponent, SfxHoverDirective, DiceLoaderComponent],
  templateUrl: './party-list.component.html',
  styleUrl: './party-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyListComponent {
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for interface copy. */
  readonly lang = this.languageService.currentLanguage;

  /** Active campaign ID for building route links. */
  readonly campaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Hero image URL from campaign data. */
  readonly heroImageUrl: Signal<string | undefined> = computed(() => {
    const campaign = this.dataService.campaign();
    if (campaign === undefined || campaign.heroImages.length === 0) {
      return undefined;
    }
    return pickRandom(campaign.heroImages);
  });

  /** Localized campaign title used by the fallback hero. */
  readonly campaignTitle: Signal<string> = computed(() => {
    const campaign = this.dataService.campaign();
    return localizeText(campaign?.name, this.lang());
  });

  /** Character showcase cards with pre-resolved quotes. */
  readonly showcases: Signal<ReadonlyArray<CharacterShowcase>> = computed(() => {
    const characters = this.dataService.characters();
    const lang = this.languageService.currentLanguage();
    return buildShowcases(characters, lang);
  });
}
