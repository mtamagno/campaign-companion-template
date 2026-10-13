/**
 * Campaign overview page — chronological list of session summaries.
 * Styled as an ancient chronicle of the adventurers' journey.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';

import { DataService } from '@guild/services/data.service';
import { LanguageService } from '@guild/services/language.service';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { AccordionComponent } from '@guild/components/accordion/accordion.component';
import { type BilingualText } from '@guild/models/language.model';
import { type Session } from '@guild/models/session.model';
import { SessionSummaryComponent } from '../../components/session-summary/session-summary.component';

/**
 * Displays all campaign sessions in chronological order.
 * Each session is rendered as a chronicle entry.
 */
@Component({
  selector: 'app-campaign-overview',
  standalone: true,
  imports: [
    SessionSummaryComponent,
    LanguageToggleComponent,
    BilingualTextPipe,
    AccordionComponent,
  ],
  templateUrl: './campaign-overview.component.html',
  styleUrl: './campaign-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignOverviewComponent {
  private readonly dataService = inject(DataService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for page copy. */
  readonly lang = this.languageService.currentLanguage;

  /** Bilingual subtitle for the page header. */
  readonly subtitle: BilingualText = {
    en: "A living record of the party's choices, discoveries, and victories.",
    it: 'Un resoconto vivo delle scelte, delle scoperte e delle vittorie della compagnia.',
  };

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Sessions sorted by session number (ascending). */
  readonly sessions: Signal<ReadonlyArray<Session>> = this.dataService.sortedSessions;

  /** Index of the last session (to auto-open its accordion). */
  readonly lastSessionIndex: Signal<number> = computed(() =>
    Math.max(0, this.sessions().length - 1),
  );
}
