/**
 * Session diary component — displays character diary entries as a timeline.
 */

import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { type DiaryEntry } from '@guild/models/character.model';
import { DiaryEntryComponent } from '../diary-entry/diary-entry.component';

/**
 * Vertical timeline of character diary entries.
 * Each entry shows what the character experienced during a session.
 */
@Component({
  selector: 'app-session-diary',
  standalone: true,
  imports: [DiaryEntryComponent],
  templateUrl: './session-diary.component.html',
  styleUrl: './session-diary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionDiaryComponent {
  /** Diary entries to display, sorted by date. */
  readonly entries = input.required<ReadonlyArray<DiaryEntry>>();
}
