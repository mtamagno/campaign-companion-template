/**
 * Route guard that blocks access to campaign pages until the user
 * has acknowledged the spoiler warning via the campaign selector modal.
 *
 * If consent is missing, the user is redirected to the root campaign selector.
 */

import { inject } from '@angular/core';
import { type ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';

import { SpoilerConsentService } from '@guild/services/spoilerConsent.service';

/**
 * Functional `CanActivateFn` guard.
 * Reads the `campaignId` route param and checks the consent cookie.
 *
 * @param route - The target route snapshot (must have a `:campaignId` param).
 * @returns `true` if consent exists, otherwise a `UrlTree` redirecting to `/`.
 */
export const spoilerConsentGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const consentService = inject(SpoilerConsentService);
  const router = inject(Router);

  const campaignId = route.paramMap.get('campaignId') ?? '';

  if (campaignId !== '' && consentService.hasConsent(campaignId)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
