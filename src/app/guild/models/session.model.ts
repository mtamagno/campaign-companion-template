/**
 * Session data models for campaign session summaries.
 */

import { type BilingualText } from '@guild/models/language.model';
import { type ImageRef } from './character.model';

/**
 * A key event (momento saliente) within a session.
 * @param description - What happened in this event.
 * @param image - Optional illustration of the event.
 */
export interface KeyEvent {
  readonly description: BilingualText;
  readonly image?: ImageRef;
}

/**
 * An illustration image for a session.
 * @param url - Path to the image file (relative to assets).
 * @param alt - Bilingual alt text for accessibility.
 * @param caption - Optional bilingual caption displayed below the image.
 * @param afterSection - If set, the image is placed inline after this prose section index (0-based, sections split by <hr>). If omitted, the image goes to the session gallery.
 */
export interface SessionImage {
  readonly url: string;
  readonly alt: BilingualText;
  readonly caption?: BilingualText;
  readonly afterSection?: number;
}

/** A campaign session — the DM's recap of what happened. */
export interface Session {
  readonly id: string;
  readonly sessionNumber: number;
  readonly date: string;
  readonly title: BilingualText;
  readonly summary: BilingualText;
  readonly keyEvents: ReadonlyArray<KeyEvent>;
  readonly location: BilingualText;
  readonly prose?: BilingualText;
  readonly images?: ReadonlyArray<SessionImage>;
  /** Short cumulative recap snippet for the "Story So Far" page. Keep it dense and spoiler-free. */
  readonly storySoFar?: BilingualText;
}
