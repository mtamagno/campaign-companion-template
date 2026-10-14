/**
 * Pipe that extracts the correct language string from a BilingualText object.
 * Reacts to the current language signal from LanguageService.
 */

import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '@guild/services/language.service';
import { localizeText, type BilingualText } from '@guild/models/language.model';

/**
 * Transforms a BilingualText into the active language string.
 *
 * @example
 * ```html
 * {{ character.publicProfile.backstory | bilingual }}
 * ```
 */
@Pipe({
  name: 'bilingual',
  standalone: true,
  pure: false,
})
export class BilingualTextPipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  /**
   * Extracts the string for the currently active language.
   * @param value - The bilingual text object.
   * @returns The string in the active language.
   */
  transform(value: BilingualText): string {
    return localizeText(value, this.languageService.currentLanguage());
  }
}
