/**
 * Language model — supported languages and bilingual text type.
 */

/** Languages supported by the bilingual compendium. */
export type SupportedLanguage = 'en' | 'it';

/** A bilingual text pair (English / Italian). */
export interface BilingualText {
  readonly en: string;
  readonly it: string;
}
