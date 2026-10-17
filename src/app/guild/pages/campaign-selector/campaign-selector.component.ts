/**
 * Campaign selector landing page.
 * Displays all available campaigns as clickable cards.
 * Shows a spoiler warning modal before entering any campaign.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  HostListener,
  signal,
  type Signal,
  type WritableSignal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';

import { CampaignService } from '@guild/services/campaign.service';
import { LanguageService } from '@guild/services/language.service';
import { SpoilerConsentService } from '@guild/services/spoilerConsent.service';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { SfxHoverDirective } from '@guild/directives/sfxHover.directive';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { type CampaignManifestEntry } from '@guild/models/campaignConfig.model';
import { localizeText } from '@guild/models/language.model';

/**
 * Root landing page that lists all available campaigns.
 * The first click opens a spoiler warning modal. Once accepted, later visits
 * enter the campaign directly without showing the warning again.
 */
@Component({
  selector: 'app-campaign-selector',
  standalone: true,
  imports: [LanguageToggleComponent, SfxHoverDirective, DiceLoaderComponent],
  templateUrl: './campaign-selector.component.html',
  styleUrl: './campaign-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSelectorComponent {
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);
  private readonly consentService = inject(SpoilerConsentService);
  private readonly router = inject(Router);

  /** All available campaigns from the manifest. */
  readonly campaigns: Signal<ReadonlyArray<CampaignManifestEntry>> = this.campaignService.manifest;

  /** Whether the manifest has been loaded. */
  readonly isLoaded: Signal<boolean> = this.campaignService.manifestLoaded;

  /** Current language code for bilingual display. */
  readonly lang = this.languageService.currentLanguage;

  /** The campaign the user clicked — drives the warning modal. */
  readonly pendingCampaign: WritableSignal<CampaignManifestEntry | undefined> = signal(undefined);

  /** Page title based on current language. */
  readonly pageTitle: Signal<string> = computed(() =>
    this.lang() === 'it' ? 'Il tuo party. La tua storia.' : 'Your party. Your story.',
  );

  /** Subtitle based on current language. */
  readonly pageSubtitle: Signal<string> = computed(() =>
    this.lang() === 'it'
      ? 'Ritrova il tuo personaggio e riprendi il viaggio.'
      : 'Find your character and return to the adventure.',
  );

  /** At-a-glance lifecycle totals for the campaign ledger. */
  readonly activeCampaignCount: Signal<number> = computed(
    () =>
      this.campaigns().filter(
        (campaign) => campaign.status?.en.toLocaleLowerCase().includes('progress') === true,
      ).length,
  );

  readonly completedCampaignCount: Signal<number> = computed(
    () =>
      this.campaigns().filter(
        (campaign) => campaign.status?.en.toLocaleLowerCase().includes('completed') === true,
      ).length,
  );

  /** Warning modal message based on current language and selected campaign. */
  readonly warningMessage: Signal<string> = computed(() => {
    const campaign = this.pendingCampaign();
    if (campaign === undefined) {
      return '';
    }
    const name = localizeText(campaign.name, this.lang());
    return this.lang() === 'it'
      ? `Stai per accedere alla campagna "${name}". Se non sei un giocatore di questa campagna, rischi di leggere spoiler!`
      : `You are about to enter the campaign "${name}". If you are not a player in this campaign, you risk reading spoilers!`;
  });

  /**
   * Opens the spoiler warning only when consent has not already been stored.
   * Returning users enter the campaign immediately.
   * @param campaign - The campaign the user wants to enter.
   */
  selectCampaign(campaign: CampaignManifestEntry): void {
    if (this.consentService.hasConsent(campaign.id)) {
      this.navigateToCampaign(campaign.id);
      return;
    }
    this.pendingCampaign.set(campaign);
  }

  /** Confirms entry: stores consent cookie then navigates to the selected campaign. */
  confirmEntry(): void {
    const campaign = this.pendingCampaign();
    if (campaign === undefined) {
      return;
    }
    this.consentService.grantConsent(campaign.id);
    this.pendingCampaign.set(undefined);
    this.navigateToCampaign(campaign.id);
  }

  /** Dismisses the warning modal without navigating. */
  cancelEntry(): void {
    this.pendingCampaign.set(undefined);
  }

  /** Closes the warning without changing consent when Escape is pressed. */
  @HostListener('document:keydown.escape')
  closeWarningOnEscape(): void {
    this.cancelEntry();
  }

  /** Navigates to a campaign after the consent decision has been resolved. */
  private navigateToCampaign(campaignId: string): void {
    void this.router.navigate(['/', campaignId]);
  }
}
