/**
 * Campaign manifest entry — metadata for the campaign selector page.
 * Each entry in `campaigns.json` maps to this interface.
 */

import { type BilingualText } from '@guild/models/language.model';

/** A single campaign listed in the global campaigns manifest. */
export interface CampaignManifestEntry {
  readonly id: string;
  /** Content languages available for this campaign (for example en, es, fr-CA). */
  readonly languages?: ReadonlyArray<string>;
  /** Language selected for first-time visitors when their saved choice is unavailable. */
  readonly defaultLanguage?: string;
  readonly name: BilingualText;
  readonly description: BilingualText;
  readonly thumbnail: string;
  /** Short localized lifecycle label shown on the campaign card. */
  readonly status?: BilingualText;
}
