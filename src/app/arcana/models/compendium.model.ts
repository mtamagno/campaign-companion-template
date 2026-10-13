/**
 * Minimal public spell metadata contracts used by the optional character-sheet UI.
 * No rulebook text or publisher data is bundled in this repository.
 */
export interface SpellEntry {
  readonly key: string;
  readonly en: string;
  readonly it: string;
  readonly level: number;
  readonly school: string;
  readonly castingTimeEn: string;
  readonly castingTimeIt: string;
  readonly rangeEn: string;
  readonly rangeIt: string;
  readonly durationEn: string;
  readonly durationIt: string;
  readonly descriptionEn: string;
  readonly descriptionIt: string;
  readonly isConcentration: boolean;
  readonly isRitual: boolean;
}

export interface SpellCategory {
  readonly id: string;
  readonly entries: ReadonlyArray<unknown>;
}

export const SPELL_SCHOOLS: Readonly<Record<string, { readonly en: string; readonly it: string }>> =
  {
    abjuration: { en: 'Abjuration', it: 'Abiurazione' },
    conjuration: { en: 'Conjuration', it: 'Evocazione' },
    divination: { en: 'Divination', it: 'Divinazione' },
    enchantment: { en: 'Enchantment', it: 'Ammaliamento' },
    evocation: { en: 'Evocation', it: 'Invocazione' },
    illusion: { en: 'Illusion', it: 'Illusione' },
    necromancy: { en: 'Necromancy', it: 'Necromanzia' },
    transmutation: { en: 'Transmutation', it: 'Trasmutazione' },
  };

export function isSpellEntry(value: unknown): value is SpellEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SpellEntry>;
  return typeof candidate.key === 'string' && typeof candidate.level === 'number';
}
