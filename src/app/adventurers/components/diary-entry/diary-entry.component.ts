/**
 * Individual diary entry component — shows a single session diary record.
 */

import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { type DiaryEntry } from '@guild/models/character.model';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';

/**
 * Renders a single diary entry with date, title, and content.
 * Used as a child of SessionDiaryComponent.
 */
@Component({
  selector: 'app-diary-entry',
  standalone: true,
  imports: [BilingualTextPipe],
  templateUrl: './diary-entry.component.html',
  styleUrl: './diary-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaryEntryComponent {
  /** The diary entry data to display. */
  readonly entry = input.required<DiaryEntry>();
}
