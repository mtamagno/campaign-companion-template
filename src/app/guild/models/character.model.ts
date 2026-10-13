/**
 * Character data models for player characters (PCs).
 * Covers public profile, private profile, character sheet, gallery, and session diary.
 */

import { type BilingualText } from '@guild/models/language.model';

/** Default password for protected character sections when none is configured. */
export const DEFAULT_CHARACTER_PASSWORD = 'cambiami';

/** Image reference used throughout the app (gallery, avatars, maps). */
export interface ImageRef {
  readonly url: string;
  readonly alt: string;
  readonly caption?: string;
}

/** Public profile — lore the party knows about this character. */
export interface CharacterPublicProfile {
  readonly backstory: BilingualText;
  readonly traits: BilingualText;
  readonly ideals: BilingualText;
  readonly bonds: BilingualText;
  readonly flaws: BilingualText;
  readonly knownHistory: BilingualText;
}

/** Private profile — secrets only the player and DM know. */
export interface CharacterPrivateProfile {
  readonly secretBackstory: BilingualText;
  readonly hiddenMotivations: BilingualText;
  readonly secrets: ReadonlyArray<BilingualText>;
  readonly dmNotes: BilingualText;
}

/** Ability scores block. */
export interface AbilityScores {
  readonly strength: number;
  readonly dexterity: number;
  readonly constitution: number;
  readonly intelligence: number;
  readonly wisdom: number;
  readonly charisma: number;
}

/** Coin carried by a character, split by common fantasy denominations. */
export interface CharacterCurrency {
  readonly cp?: number;
  readonly sp?: number;
  readonly ep?: number;
  readonly gp?: number;
  readonly pp?: number;
}

/** A pool of spell slots for one spell level. */
export interface CharacterSpellSlots {
  readonly level: number;
  readonly total: number;
  readonly used?: number;
}

/** Spellcasting values that cannot always be inferred from the base sheet. */
export interface CharacterSpellcasting {
  readonly ability:
    'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
  readonly spellSaveDC?: number;
  readonly spellAttackBonus?: number;
  readonly slots?: ReadonlyArray<CharacterSpellSlots>;
}

/** Character sheet — six-ability fantasy RPG stats and equipment. */
export interface CharacterSheet {
  readonly level: number;
  readonly classType: string;
  readonly subclass?: string;
  readonly race: string;
  readonly background: string;
  readonly alignment: string;
  readonly experiencePoints: number;
  readonly hitPoints: number;
  readonly maxHitPoints: number;
  readonly armorClass: number;
  readonly speed: number;
  readonly proficiencyBonus: number;
  readonly abilityScores: AbilityScores;
  readonly savingThrows: ReadonlyArray<string>;
  readonly skills: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
  readonly equipment: ReadonlyArray<string>;
  readonly features: ReadonlyArray<string>;
  readonly spells?: ReadonlyArray<string>;
  readonly currency?: CharacterCurrency;
  readonly spellcasting?: CharacterSpellcasting;
}

/** Immutable character-sheet snapshot kept when the character gains a level. */
export interface CharacterSheetSnapshot {
  readonly sheet: CharacterSheet;
  readonly title?: BilingualText;
  readonly recordedAt?: string;
}

/** A single entry in the character's session diary. */
export interface DiaryEntry {
  readonly sessionId: string;
  readonly date: string;
  readonly title: BilingualText;
  readonly content: BilingualText;
}

/**
 * Per-session knowledge snapshot — what the character did and learned during a session.
 * @param sessionId - Reference to the session.
 * @param actions - What the character did during the session.
 * @param knownInfo - What the character (and player) knows by the end of the session.
 */
export interface SessionKnowledge {
  readonly sessionId: string;
  readonly actions: ReadonlyArray<BilingualText>;
  readonly knownInfo: ReadonlyArray<BilingualText>;
}

/** An iconic quote from a character during a session. */
export interface CharacterQuote {
  readonly sessionId: string;
  readonly text: BilingualText;
  readonly context?: BilingualText;
}

/** Full player character entity. */
export interface Character {
  readonly id: string;
  readonly name: string;
  readonly sex: BilingualText;
  readonly playerName?: string;
  readonly avatar: ImageRef;
  readonly gallery: ReadonlyArray<ImageRef>;
  /** 800x600 profile image (main). */
  readonly profileImageUrl: string;
  /** 1024x1536 portrait image (side, desktop only). */
  readonly portraitImageUrl: string;
  readonly publicProfile: CharacterPublicProfile;
  readonly privateProfile: CharacterPrivateProfile;
  /** Older level snapshots. The current version always remains in `sheet`. */
  readonly sheetHistory?: ReadonlyArray<CharacterSheetSnapshot>;
  readonly sheet: CharacterSheet;
  readonly diary: ReadonlyArray<DiaryEntry>;
  readonly sessionKnowledge: ReadonlyArray<SessionKnowledge>;
  readonly quotes: ReadonlyArray<CharacterQuote>;
  readonly password?: string;
}
