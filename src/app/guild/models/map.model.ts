/**
 * Map / Location data models for visited locations in the campaign.
 */

import { type BilingualText } from './language.model';
import { type ImageRef } from './character.model';

/** A discovery or notable finding at a location. */
export interface Discovery {
  readonly title: BilingualText;
  readonly description: BilingualText;
  readonly sessionId: string;
}

/** Exploration status for a map location. */
export const EXPLORATION_STATUSES = {
  UNEXPLORED: 'unexplored',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
} as const;

export type ExplorationStatus = (typeof EXPLORATION_STATUSES)[keyof typeof EXPLORATION_STATUSES];

/** A visited location / map in the campaign. */
export interface GameMap {
  readonly id: string;
  readonly name: BilingualText;
  readonly description: BilingualText;
  readonly images: ReadonlyArray<ImageRef>;
  readonly discoveries: ReadonlyArray<Discovery>;
  readonly explorationStatus: ExplorationStatus;
  readonly region: BilingualText;
}
