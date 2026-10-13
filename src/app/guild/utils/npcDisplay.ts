/**
 * NPC display utilities.
 * Defensive helpers that normalize NPC fields before display or sorting,
 * to keep the UI resilient even if a JSON data file drifts from the model.
 */

import { type Npc } from '@guild/models/npc.model';
import { type BilingualText } from '@guild/models/language.model';

/**
 * Type guard that detects a `BilingualText` shape at runtime.
 * @param value - The value to inspect.
 * @returns True when the value looks like a `BilingualText` object.
 */
function isBilingualText(value: unknown): value is BilingualText {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { en?: unknown; it?: unknown };
  return typeof candidate.en === 'string' && typeof candidate.it === 'string';
}

/**
 * Resolves an NPC display name to a plain string, regardless of whether the
 * JSON source provided a string or a bilingual object. Prefers English when
 * the data is bilingual, falls back to Italian, and finally to an empty string
 * so callers can sort or render without crashing.
 * @param npc - The NPC whose name should be normalized.
 * @returns A plain string suitable for display or for `localeCompare`.
 */
export function getNpcDisplayName(npc: Npc): string {
  const rawName: unknown = npc.name;
  if (typeof rawName === 'string') {
    return rawName;
  }
  if (isBilingualText(rawName)) {
    if (rawName.en.length > 0) {
      return rawName.en;
    }
    return rawName.it;
  }
  return '';
}
