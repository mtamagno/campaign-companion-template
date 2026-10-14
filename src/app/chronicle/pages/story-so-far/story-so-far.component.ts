/**
 * Story So Far page — a compact cumulative recap across all sessions.
 * Reads the optional `storySoFar` snippet from each session and renders them
 * in chronological order. Each snippet is kept short (a few lines) so that
 * the whole page stays around ~20 lines total of dense, spoiler-free narrative.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';

import { DataService } from '@guild/services/data.service';
import { LanguageService } from '@guild/services/language.service';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { AccordionComponent } from '@guild/components/accordion/accordion.component';
import { localizeText, type BilingualText } from '@guild/models/language.model';
import { type Session } from '@guild/models/session.model';

/** A session entry that has a populated `storySoFar` snippet. */
interface StorySoFarEntry {
  readonly id: string;
  readonly sessionNumber: number;
  readonly title: BilingualText;
  readonly date: string;
  readonly storySoFar: BilingualText;
}

/**
 * Selects only sessions that have a non-empty `storySoFar` recap.
 * @param sessions - All sessions in chronological order.
 * @returns Entries ready to render, preserving order.
 */
function selectRecapEntries(sessions: ReadonlyArray<Session>): ReadonlyArray<StorySoFarEntry> {
  const entries: StorySoFarEntry[] = [];
  for (const session of sessions) {
    const recap = session.storySoFar;
    if (recap !== undefined && Object.values(recap).some((value) => value.trim().length > 0)) {
      entries.push({
        id: session.id,
        sessionNumber: session.sessionNumber,
        title: session.title,
        date: session.date,
        storySoFar: recap,
      });
    }
  }
  return entries;
}

@Component({
  selector: 'app-story-so-far',
  standalone: true,
  imports: [LanguageToggleComponent, BilingualTextPipe, AccordionComponent, DiceLoaderComponent],
  templateUrl: './story-so-far.component.html',
  styleUrl: './story-so-far.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorySoFarComponent {
  private readonly dataService = inject(DataService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for page copy. */
  readonly lang = this.languageService.currentLanguage;

  readonly subtitle: BilingualText = {
    en: 'Everything that has happened so far, in a few lines per session.',
    it: 'Tutto quello che è successo finora, in poche righe per sessione.',
  };

  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Cumulative campaign-wide recap shown at the top of the page. */
  readonly campaignRecap: Signal<BilingualText | undefined> = computed(
    () => this.dataService.campaign()?.storySoFar,
  );

  readonly entries: Signal<ReadonlyArray<StorySoFarEntry>> = computed(() =>
    selectRecapEntries(this.dataService.sortedSessions()),
  );

  /**
   * Builds the localized accordion title for a session entry.
   * @param entry - The session recap entry.
   * @returns A plain string usable as accordion title.
   */
  readonly entryAccordionTitle = (entry: StorySoFarEntry): string => {
    const lang = this.languageService.currentLanguage();
    const sessionLabel = lang === 'it' ? 'Sessione' : 'Session';
    const localizedTitle = localizeText(entry.title, lang);
    return `${sessionLabel} ${entry.sessionNumber} — ${localizedTitle}`;
  };
}
