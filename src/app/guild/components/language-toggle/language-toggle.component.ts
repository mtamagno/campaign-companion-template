/**
 * Language toggle component.
 * Displays a switch button that lets the user choose between IT and EN.
 * Reads and writes through the LanguageService.
 */

import { Component, ChangeDetectionStrategy, inject, type Signal } from '@angular/core';

import { LanguageService } from '@guild/services/language.service';
import { type SupportedLanguage } from '@guild/models/language.model';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [],
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageToggleComponent {
  private readonly languageService = inject(LanguageService);

  /** The currently active language. */
  readonly currentLanguage: Signal<SupportedLanguage> = this.languageService.currentLanguage;

  /** Switches between IT and EN. */
  toggle(): void {
    this.languageService.toggle();
  }
}
