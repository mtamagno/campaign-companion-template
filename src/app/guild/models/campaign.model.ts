/**
 * Campaign metadata model.
 */

import { type BilingualText } from '@guild/models/language.model';

/** Top-level campaign information. */
export interface Campaign {
  /** Content language codes available for this campaign. */
  readonly languages?: ReadonlyArray<string>;
  /** Preferred language when a visitor has no compatible saved choice. */
  readonly defaultLanguage?: string;
  readonly name: BilingualText;
  readonly description: BilingualText;
  readonly edition: string;
  readonly startDate: string;
  readonly dungeonMaster: string;
  readonly partyName: string;
  /** Hero images displayed on the campaign homepage (campaign-relative paths). */
  readonly heroImages: ReadonlyArray<string>;
  /**
   * Cumulative campaign-wide recap shown at the top of the Story So Far page.
   * A short, dense, spoiler-free digest of every session played so far.
   * Must be updated every time a session's prose is written or modified.
   */
  readonly storySoFar?: BilingualText;
}
