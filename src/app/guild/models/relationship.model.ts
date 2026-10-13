/**
 * Relationship models for party and NPC connection graphs.
 * Used to render visual relationship maps.
 */

import { type BilingualText } from '@guild/models/language.model';

/** Types of relationships between characters. */
export const RELATIONSHIP_TYPES = {
  FRIENDSHIP: 'friendship',
  RIVALRY: 'rivalry',
  ALLIANCE: 'alliance',
  ROMANCE: 'romance',
  FAMILY: 'family',
  MENTOR: 'mentor',
  ENEMY: 'enemy',
  NEUTRAL: 'neutral',
  DISTRUST: 'distrust',
  RESPECT: 'respect',
} as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

/**
 * A directed relationship edge in the graph.
 * @param sourceId - The character/NPC who holds this relationship.
 * @param targetId - The character/NPC they have a relationship with.
 * @param type - The nature of the relationship.
 * @param description - A short description of their bond.
 * @param isBidirectional - Whether the relationship is mutual.
 * @param sharedEvents - Key moments that shaped this relationship.
 * @param quotes - Memorable dialogue between the two characters.
 * @param evolution - How the relationship changed over time.
 */
export interface Relationship {
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: RelationshipType;
  readonly description: BilingualText;
  readonly isBidirectional: boolean;
  readonly sharedEvents?: ReadonlyArray<SharedEvent>;
  readonly quotes?: ReadonlyArray<RelationshipQuote>;
  readonly evolution?: ReadonlyArray<RelationshipEvolution>;
}

/**
 * A key event that shaped a relationship, tied to a specific session.
 * @param sessionId - The session where this event occurred.
 * @param title - Short title of the event.
 * @param description - What happened and how it affected the relationship.
 */
export interface SharedEvent {
  readonly sessionId: string;
  readonly title: BilingualText;
  readonly description: BilingualText;
}

/**
 * A memorable quote or dialogue exchange between two characters.
 * @param sessionId - The session where this was said.
 * @param speakerId - Who said it (sourceId or targetId).
 * @param text - The quote text.
 */
export interface RelationshipQuote {
  readonly sessionId: string;
  readonly speakerId: string;
  readonly text: BilingualText;
}

/**
 * A snapshot of how the relationship evolved at a point in time.
 * @param sessionId - The session that triggered this evolution.
 * @param fromType - The relationship type before the change (optional for initial state).
 * @param toType - The relationship type after the change.
 * @param note - Explanation of what caused the shift.
 */
export interface RelationshipEvolution {
  readonly sessionId: string;
  readonly fromType?: RelationshipType;
  readonly toType: RelationshipType;
  readonly note: BilingualText;
}

/**
 * Node type in the relationship graph.
 * Used to visually distinguish PCs from NPCs.
 */
export const NODE_TYPES = {
  PC: 'pc',
  NPC: 'npc',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

/** Bilingual labels for relationship types. */
export const RELATIONSHIP_TYPE_LABELS: Readonly<Record<RelationshipType, BilingualText>> = {
  friendship: { en: 'Friendship', it: 'Amicizia' },
  rivalry: { en: 'Rivalry', it: 'Rivalità' },
  alliance: { en: 'Alliance', it: 'Alleanza' },
  romance: { en: 'Romance', it: 'Romanticismo' },
  family: { en: 'Family', it: 'Famiglia' },
  mentor: { en: 'Mentor', it: 'Mentore' },
  enemy: { en: 'Enemy', it: 'Nemico' },
  neutral: { en: 'Neutral', it: 'Neutrale' },
  distrust: { en: 'Distrust', it: 'Diffidenza' },
  respect: { en: 'Respect', it: 'Rispetto' },
} as const;

/** Emoji icons for relationship types — used in graph edges and legend. */
export const RELATIONSHIP_TYPE_EMOJIS: Readonly<Record<RelationshipType, string>> = {
  friendship: '🤝',
  rivalry: '⚔️',
  alliance: '🛡️',
  romance: '❤️',
  family: '🏠',
  mentor: '📖',
  enemy: '💀',
  neutral: '➖',
  distrust: '👁️',
  respect: '⭐',
} as const;

/** A node in the relationship graph (represents a character or NPC). */
export interface RelationshipNode {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string;
  readonly nodeType: NodeType;
}
