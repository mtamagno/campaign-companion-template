/**
 * NPC display utilities.
 * Defensive helpers that normalize NPC fields before display or sorting,
 * to keep the UI resilient even if a JSON data file drifts from the model.
 */

import { type Npc } from '@guild/models/npc.model';
import {
  localizeText,
  type BilingualText,
  type SupportedLanguage,
} from '@guild/models/language.model';

/**
 * Type guard that detects a `BilingualText` shape at runtime.
 * @param value - The value to inspect.
 * @returns True when the value looks like a `BilingualText` object.
 */
function isLocalizedText(value: unknown): value is BilingualText {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).some((entry) => typeof entry === 'string');
}

/**
 * Resolves an NPC display name to a plain string, regardless of whether the
 * JSON source provided a string or a localized object. It prefers the active
 * language, then English, then the first populated translation.
 * @param npc - The NPC whose name should be normalized.
 * @returns A plain string suitable for display or for `localeCompare`.
 */
export function getNpcDisplayName(npc: Npc, language: SupportedLanguage = 'en'): string {
  const rawName: unknown = npc.name;
  if (typeof rawName === 'string') {
    return rawName;
  }
  if (isLocalizedText(rawName)) {
    return localizeText(rawName, language);
  }
  return '';
}
