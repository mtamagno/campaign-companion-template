/**
 * Language model — arbitrary campaign locales and localized text values.
 */

/** Any valid BCP-47-style language code configured by a campaign. */
export type SupportedLanguage = string;

/**
 * A localized text map. English and Italian remain required by the legacy
 * built-in sample; additional campaign languages are accepted dynamically.
 */
export interface BilingualText {
  readonly en: string;
  readonly it: string;
  readonly [language: string]: string;
}

/** Resolves localized content with predictable English/first-value fallbacks. */
export function localizeText(
  value: BilingualText | Readonly<Record<string, string>> | undefined,
  language: SupportedLanguage,
): string {
  if (value === undefined) return '';
  return (
    value[language] || value.en || Object.values(value).find((entry) => entry.length > 0) || ''
  );
}
