/**
 * NPC data models for non-player characters.
 * Simpler than PC models — no character sheet, no password-protected sections.
 */

import { type BilingualText } from '@guild/models/language.model';
import { type ImageRef } from './character.model';

/** NPC profile — public information about the NPC. */
export interface NpcProfile {
  readonly description: BilingualText;
  readonly role: BilingualText;
  readonly personality: BilingualText;
  readonly location: BilingualText;
  readonly knownHistory: BilingualText;
}

/** NPC allegiance — relationship with the party. */
export const NPC_ALLEGIANCES = {
  ALLY: 'ally',
  ENEMY: 'enemy',
  NEUTRAL: 'neutral',
} as const;

export type NpcAllegiance = (typeof NPC_ALLEGIANCES)[keyof typeof NPC_ALLEGIANCES];

/** Full NPC entity. */
export interface Npc {
  readonly id: string;
  readonly name: string;
  readonly sex: BilingualText;
  readonly title?: string;
  readonly profileImageUrl?: string;
  readonly portraitImageUrl?: string;
  readonly avatar: ImageRef;
  readonly gallery: ReadonlyArray<ImageRef>;
  readonly profile: NpcProfile;
  readonly allegiance: NpcAllegiance;
  readonly isAlive: boolean;
  readonly category?: string;
  /** When true, the NPC is hidden from the sidebar but still listed in the full NPC page. */
  readonly isMinor?: boolean;
}
