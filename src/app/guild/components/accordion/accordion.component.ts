/**
 * Reusable accordion component.
 * Displays a collapsible section with a header and projected content.
 * Supports smooth height animation on open/close.
 *
 * @example
 * ```html
 * <app-accordion [title]="'Ability Scores'" [icon]="'💪'">
 *   <p>Projected content here...</p>
 * </app-accordion>
 * ```
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  type OnInit,
  type WritableSignal,
} from '@angular/core';

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [],
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent implements OnInit {
  /** Title displayed in the accordion header. */
  readonly title = input.required<string>();

  /** Optional icon (emoji) shown before the title. */
  readonly icon = input<string>('');

  /** Whether the accordion starts in the open state. */
  readonly startOpen = input<boolean>(false);

  /** Lets rich content such as sticky toolbars escape the panel clipping area while open. */
  readonly allowOverflow = input<boolean>(false);

  /** Whether the accordion panel is currently expanded. */
  readonly isOpen: WritableSignal<boolean> = signal(false);

  /** Initializes the open state from the startOpen input. */
  ngOnInit(): void {
    if (this.startOpen()) {
      this.isOpen.set(true);
    }
  }

  /** Toggles the accordion open/closed state. */
  toggle(): void {
    this.isOpen.update((open) => !open);
  }
}
