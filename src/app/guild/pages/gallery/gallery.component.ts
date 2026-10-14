/**
 * Gallery page — displays all campaign images organized by category.
 * Aggregates images from characters, NPCs, group photos, and sessions.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  type Signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { DataService } from '@guild/services/data.service';
import { LanguageService } from '@guild/services/language.service';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { ImageLightboxComponent } from '@guild/components/image-lightbox/image-lightbox.component';
import { AccordionComponent } from '@guild/components/accordion/accordion.component';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import {
  localizeText,
  type BilingualText,
  type SupportedLanguage,
} from '@guild/models/language.model';
import { type ImageRef } from '@guild/models/character.model';
import { type Npc } from '@guild/models/npc.model';
import { getNpcDisplayName } from '@guild/utils/npcDisplay';
import { toThumbUrl } from '@guild/services/imageUrl.service';

/** A single image entry in the gallery. */
interface GalleryItem {
  readonly url: string;
  readonly thumbUrl: string;
  readonly alt: BilingualText;
  readonly label: string;
}

/** A subgroup of items inside a section (e.g. NPCs grouped by location). */
interface GallerySubgroup {
  readonly title: string;
  readonly items: ReadonlyArray<GalleryItem>;
}

/**
 * A labeled section of gallery images.
 * Either `items` (flat list) or `subgroups` (grouped list) is populated, never both.
 */
interface GallerySection {
  readonly title: string;
  readonly icon: string;
  readonly items?: ReadonlyArray<GalleryItem>;
  readonly subgroups?: ReadonlyArray<GallerySubgroup>;
  /** When true, the section is rendered inside a collapsible accordion. */
  readonly collapsible?: boolean;
  /** When the section is collapsible, whether it starts open. */
  readonly startOpen?: boolean;
}

/** Fallback location label when an NPC has no location defined. */
const UNKNOWN_LOCATION_LABEL = 'Unknown';

/** Placeholder image shown when a gallery thumbnail fails to load. */
const PLACEHOLDER_IMAGE_URL = 'assets/images/placeholders/placeholder-portrait.svg';

/** Placeholder art is useful in cards but should never populate the gallery. */
function isGalleryImage(url: string | undefined): url is string {
  return url !== undefined && !url.includes('placeholder-portrait');
}

/**
 * Renders a gallery of all campaign images, organized into sections:
 * Party portraits, NPC images (grouped by location), group photos,
 * session illustrations, and a collapsible Minor NPCs section at the bottom.
 */
@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    LanguageToggleComponent,
    BilingualTextPipe,
    ImageLightboxComponent,
    AccordionComponent,
    NgTemplateOutlet,
    DiceLoaderComponent,
  ],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryComponent {
  private readonly dataService = inject(DataService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for page copy and section labels. */
  readonly lang = this.languageService.currentLanguage;

  /** Whether the lightbox is open. */
  readonly isLightboxOpen = signal<boolean>(false);

  /** Images passed to the lightbox (converted to ImageRef). */
  readonly lightboxImages = signal<ReadonlyArray<ImageRef>>([]);

  /** Index of the currently viewed image in the lightbox. */
  readonly lightboxIndex = signal<number>(0);

  /** All gallery sections with their images. */
  readonly sections: Signal<ReadonlyArray<GallerySection>> = computed(() => {
    const result: Array<GallerySection> = [];
    const italian = this.lang() === 'it';

    const partyItems = this.buildPartySection();
    if (partyItems.length > 0) {
      result.push({ title: italian ? 'Compagnia' : 'Party', icon: '🎭', items: partyItems });
    }

    const mainNpcSubgroups = this.buildNpcSubgroupsByLocation((npc) => npc.isMinor !== true);
    if (mainNpcSubgroups.length > 0) {
      result.push({ title: 'NPCs', icon: '📜', subgroups: mainNpcSubgroups });
    }

    const groupItems = this.buildGroupSection();
    if (groupItems.length > 0) {
      result.push({ title: italian ? 'Gruppo' : 'Group', icon: '👥', items: groupItems });
    }

    const sessionItems = this.buildSessionSection();
    if (sessionItems.length > 0) {
      result.push({ title: italian ? 'Sessioni' : 'Sessions', icon: '📖', items: sessionItems });
    }

    // Minor NPCs go last and are collapsed by default to keep the focus
    // on main characters. They still group by location for consistency.
    const minorNpcSubgroups = this.buildNpcSubgroupsByLocation((npc) => npc.isMinor === true);
    if (minorNpcSubgroups.length > 0) {
      result.push({
        title: italian ? 'NPC minori' : 'Minor NPCs',
        icon: '👤',
        subgroups: minorNpcSubgroups,
        collapsible: true,
        startOpen: false,
      });
    }

    return result;
  });

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /**
   * Opens the lightbox for a given list of items at the clicked image index.
   * @param items - The gallery items in the section or subgroup.
   * @param index - The index of the clicked image.
   */
  openLightbox(items: ReadonlyArray<GalleryItem>, index: number): void {
    const lang = this.languageService.currentLanguage();
    const refs: ReadonlyArray<ImageRef> = items.map((item) => ({
      url: item.url,
      alt: localizeText(item.alt, lang),
      caption: item.label,
    }));
    this.lightboxImages.set(refs);
    this.lightboxIndex.set(index);
    this.isLightboxOpen.set(true);
  }

  /** Closes the lightbox. */
  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  /**
   * Updates the lightbox index when navigating.
   * @param index - The new image index.
   */
  onLightboxNavigate(index: number): void {
    this.lightboxIndex.set(index);
  }

  /**
   * Replaces a broken thumbnail with the campaign placeholder.
   * Once the placeholder loads we still tag the image as loaded so the
   * shimmer effect is dismissed.
   * @param event - The img error event.
   */
  onImageError(event: Event): void {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) {
      return;
    }
    if (img.src.endsWith(PLACEHOLDER_IMAGE_URL)) {
      // Already on the placeholder — avoid an infinite error loop.
      return;
    }
    img.src = PLACEHOLDER_IMAGE_URL;
    img.classList.add('is-loaded', 'gallery__image--placeholder');
  }

  /**
   * Builds gallery items from PC profile and portrait images.
   * @returns Gallery items for all party members.
   */
  private buildPartySection(): ReadonlyArray<GalleryItem> {
    const characters = this.dataService.characters();
    const items: Array<GalleryItem> = [];

    for (const character of characters) {
      const name = character.name;

      if (isGalleryImage(character.profileImageUrl)) {
        items.push({
          url: character.profileImageUrl,
          thumbUrl: toThumbUrl(character.profileImageUrl),
          alt: { en: `${name} — profile`, it: `${name} — profilo` },
          label: name,
        });
      }

      if (
        isGalleryImage(character.portraitImageUrl) &&
        character.portraitImageUrl !== character.profileImageUrl
      ) {
        items.push({
          url: character.portraitImageUrl,
          thumbUrl: toThumbUrl(character.portraitImageUrl),
          alt: { en: `${name} — portrait`, it: `${name} — ritratto` },
          label: name,
        });
      }
    }

    return items;
  }

  /**
   * Builds NPC gallery items grouped by location.
   * Subgroups are sorted alphabetically by location name; within each subgroup
   * NPCs are sorted alphabetically by name.
   * @param filter - Predicate to select which NPCs to include (e.g. minor vs main).
   * @returns Subgroups of NPC gallery items by location, or empty array if none match.
   */
  private buildNpcSubgroupsByLocation(
    filter: (npc: Npc) => boolean,
  ): ReadonlyArray<GallerySubgroup> {
    const npcs = this.dataService.npcs().filter(filter);
    if (npcs.length === 0) {
      return [];
    }

    const lang = this.languageService.currentLanguage();
    const buckets = new Map<string, Array<Npc>>();

    for (const npc of npcs) {
      const locationLabel = this.resolveNpcLocation(npc, lang);
      const existing = buckets.get(locationLabel);
      if (existing !== undefined) {
        existing.push(npc);
      } else {
        buckets.set(locationLabel, [npc]);
      }
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([locationLabel, locationNpcs]) => ({
        title: locationLabel,
        items: this.buildItemsForNpcs(
          [...locationNpcs].sort((a, b) =>
            getNpcDisplayName(a).localeCompare(getNpcDisplayName(b)),
          ),
        ),
      }))
      .filter((subgroup) => subgroup.items.length > 0);
  }

  /**
   * Resolves the display label for an NPC's location in the active language.
   * @param npc - The NPC whose location should be read.
   * @param lang - Active language code.
   * @returns The localized location string, or a fallback when missing.
   */
  private resolveNpcLocation(npc: Npc, lang: SupportedLanguage): string {
    const location = npc.profile.location;
    if (location === undefined) {
      return UNKNOWN_LOCATION_LABEL;
    }
    const localized = localizeText(location, lang);
    const trimmed = localized.trim();
    return trimmed.length > 0 ? trimmed : UNKNOWN_LOCATION_LABEL;
  }

  /**
   * Builds gallery items (profile + portrait) for a sorted list of NPCs.
   * @param npcs - NPCs already filtered and sorted.
   * @returns Flat list of gallery items in NPC order.
   */
  private buildItemsForNpcs(npcs: ReadonlyArray<Npc>): ReadonlyArray<GalleryItem> {
    const items: Array<GalleryItem> = [];

    for (const npc of npcs) {
      const name = getNpcDisplayName(npc);

      if (isGalleryImage(npc.profileImageUrl)) {
        items.push({
          url: npc.profileImageUrl,
          thumbUrl: toThumbUrl(npc.profileImageUrl),
          alt: { en: `${name} — profile`, it: `${name} — profilo` },
          label: name,
        });
      }

      if (isGalleryImage(npc.portraitImageUrl) && npc.portraitImageUrl !== npc.profileImageUrl) {
        items.push({
          url: npc.portraitImageUrl,
          thumbUrl: toThumbUrl(npc.portraitImageUrl),
          alt: { en: `${name} — portrait`, it: `${name} — ritratto` },
          label: name,
        });
      }
    }

    return items;
  }

  /**
   * Builds gallery items from group photos.
   * @returns Gallery items for group images.
   */
  private buildGroupSection(): ReadonlyArray<GalleryItem> {
    const campaign = this.dataService.campaign();
    const heroImages: ReadonlyArray<string> = campaign?.heroImages ?? [];
    return heroImages.map((url: string) => ({
      url,
      thumbUrl: toThumbUrl(url),
      alt: { en: 'Party group photo', it: 'Foto di gruppo' },
      label: 'SKYV',
    }));
  }

  /**
   * Builds gallery items from session illustrations.
   * @returns Gallery items for all session images.
   */
  private buildSessionSection(): ReadonlyArray<GalleryItem> {
    const sessions = this.dataService.sessions();
    const items: Array<GalleryItem> = [];

    for (const session of sessions) {
      if (session.images === undefined) {
        continue;
      }
      for (const image of session.images) {
        items.push({
          url: image.url,
          thumbUrl: toThumbUrl(image.url),
          alt: image.alt,
          label: `Session ${String(session.sessionNumber)}`,
        });
      }
    }

    return items;
  }
}
