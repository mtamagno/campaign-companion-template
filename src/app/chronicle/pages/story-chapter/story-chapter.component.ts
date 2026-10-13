/**
 * Story chapter page — displays a session's prose narrative
 * in book-style typography (serif, wide margins, elegant layout).
 * Supports inline session images positioned between prose sections.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DataService } from '@guild/services/data.service';
import { CampaignService } from '@guild/services/campaign.service';
import { LanguageService } from '@guild/services/language.service';
import { toDisplayUrl } from '@guild/services/imageUrl.service';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { type Session, type SessionImage } from '@guild/models/session.model';

/** Regex to split prose HTML at &lt;hr&gt; scene breaks. */
const PROSE_SECTION_SEPARATOR = /<hr\s*\/?>/gi;

/** A prose section paired with any images that follow it. */
interface ProseChunk {
  readonly html: string;
  readonly images: ReadonlyArray<SessionImage>;
}

/**
 * Groups session images by their `afterSection` index.
 * @param images - The session images array.
 * @returns A record mapping section index to its images.
 */
function groupImagesBySection(
  images: ReadonlyArray<SessionImage>,
): Readonly<Record<number, ReadonlyArray<SessionImage>>> {
  const result: Record<number, Array<SessionImage>> = {};
  for (const image of images) {
    if (image.afterSection !== undefined) {
      const existing = result[image.afterSection];
      if (existing !== undefined) {
        existing.push(image);
      } else {
        result[image.afterSection] = [image];
      }
    }
  }
  return result;
}

/**
 * Returns the same image with its `url` rewritten to the lighter display
 * variant. The original full-resolution file remains available for the
 * gallery lightbox; the prose only ever needs the display tier.
 * @param image - The session image to rewrite.
 * @returns A new SessionImage pointing to the display variant.
 */
function toDisplaySessionImage(image: SessionImage): SessionImage {
  return { ...image, url: toDisplayUrl(image.url) };
}

/**
 * Renders a single session's prose narrative as a literary chapter.
 * Loads session by route param `:id` and displays the `prose` field
 * with inline images positioned between prose sections.
 */
@Component({
  selector: 'app-story-chapter',
  standalone: true,
  imports: [RouterLink, LanguageToggleComponent, BilingualTextPipe, DiceLoaderComponent],
  templateUrl: './story-chapter.component.html',
  styleUrl: './story-chapter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryChapterComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);

  /** Active campaign ID for building route links. */
  readonly campaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** Session ID from route params. */
  private readonly sessionId: Signal<string | undefined> = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  /** The loaded session data. */
  readonly session: Signal<Session | undefined> = computed(() => {
    const id = this.sessionId();
    if (id === undefined) {
      return undefined;
    }
    return this.dataService.getSessionById(id)();
  });

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Chapter number derived from session number. */
  readonly chapterLabel: Signal<string> = computed(() => {
    const session = this.session();
    if (session === undefined) {
      return '';
    }
    return toRomanNumeral(session.sessionNumber);
  });

  /** Prose split into sections at scene breaks, paired with inline images. */
  readonly proseChunks: Signal<ReadonlyArray<ProseChunk>> = computed(() => {
    const session = this.session();
    if (session?.prose === undefined) {
      return [];
    }
    const lang = this.languageService.currentLanguage();
    const sections = session.prose[lang].split(PROSE_SECTION_SEPARATOR);
    const displayImages = (session.images ?? []).map(toDisplaySessionImage);
    const imagesBySection = groupImagesBySection(displayImages);

    return sections.map((html, index) => ({
      html,
      images: imagesBySection[index] ?? [],
    }));
  });

  /** Images without a section placement — shown in the gallery at the end. */
  readonly galleryImages: Signal<ReadonlyArray<SessionImage>> = computed(() => {
    const session = this.session();
    if (session?.images === undefined) {
      return [];
    }
    return session.images
      .filter((image) => image.afterSection === undefined)
      .map(toDisplaySessionImage);
  });
}

/**
 * Converts a number (1-20) to a Roman numeral string.
 * @param value - The positive integer to convert.
 * @returns The Roman numeral representation.
 */
function toRomanNumeral(value: number): string {
  const numerals: ReadonlyArray<readonly [number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let result = '';
  let remaining = value;
  for (const [threshold, symbol] of numerals) {
    while (remaining >= threshold) {
      result += symbol;
      remaining -= threshold;
    }
  }
  return result;
}
