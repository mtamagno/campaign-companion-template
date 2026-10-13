/**
 * Manages per-campaign spoiler consent cookies.
 * Each campaign has its own cookie (`spoiler_consent_{campaignId}`).
 * Consent is mirrored to localStorage so the choice remains reliable when
 * browsers restrict cookies. Private browsing still clears it with the session.
 */

import { Injectable } from '@angular/core';

/** Number of days a spoiler consent cookie stays valid. */
const CONSENT_EXPIRY_DAYS = 365;

/** Prefix used for the localStorage fallback. */
const CONSENT_STORAGE_PREFIX = 'campaign-companion:spoiler-consent:';

/** Value stored in the cookie when consent is granted. */
const CONSENT_VALUE = 'accepted';

/**
 * Builds the cookie name for a given campaign.
 * @param campaignId - Unique campaign identifier.
 * @returns The cookie key string.
 */
function buildCookieName(campaignId: string): string {
  return `spoiler_consent_${campaignId}`;
}

/** Builds the persistent-storage key for a campaign. */
function buildStorageKey(campaignId: string): string {
  return `${CONSENT_STORAGE_PREFIX}${campaignId}`;
}

/**
 * Service that reads and writes per-campaign spoiler consent cookies.
 * Used by the spoiler consent guard and the campaign selector modal.
 */
@Injectable({ providedIn: 'root' })
export class SpoilerConsentService {
  /**
   * Checks whether the user has already accepted the spoiler warning
   * for the given campaign.
   * @param campaignId - The campaign to check consent for.
   * @returns `true` if a valid consent cookie exists.
   */
  hasConsent(campaignId: string): boolean {
    const name = buildCookieName(campaignId);
    const cookieAccepted =
      typeof document !== 'undefined' &&
      document.cookie.split('; ').some((entry) => entry === `${name}=${CONSENT_VALUE}`);

    if (cookieAccepted) {
      return true;
    }

    try {
      return (
        typeof window !== 'undefined' &&
        window.localStorage.getItem(buildStorageKey(campaignId)) === CONSENT_VALUE
      );
    } catch {
      return false;
    }
  }

  /**
   * Stores spoiler consent for the given campaign for one year.
   * @param campaignId - The campaign the user is granting consent for.
   */
  grantConsent(campaignId: string): void {
    const name = buildCookieName(campaignId);
    const expires = new Date();
    expires.setDate(expires.getDate() + CONSENT_EXPIRY_DAYS);

    if (typeof document !== 'undefined') {
      const secure =
        typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${name}=${CONSENT_VALUE}; expires=${expires.toUTCString()}; max-age=${CONSENT_EXPIRY_DAYS * 86400}; path=/; SameSite=Lax${secure}`;
    }

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(buildStorageKey(campaignId), CONSENT_VALUE);
      }
    } catch {
      // Storage may be unavailable in strict privacy modes; the cookie still works.
    }
  }
}
