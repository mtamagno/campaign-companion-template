/**
 * Language selector for every locale configured by the active campaign.
 */

import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  type Signal,
} from '@angular/core';

import { LanguageService } from '@guild/services/language.service';
import { CampaignService } from '@guild/services/campaign.service';
import { type SupportedLanguage } from '@guild/models/language.model';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [],
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageToggleComponent {
  private readonly languageService = inject(LanguageService);
  private readonly campaignService = inject(CampaignService);

  /** The currently active language. */
  readonly currentLanguage: Signal<SupportedLanguage> = this.languageService.currentLanguage;

  /** Languages configured by the active campaign, with sensible legacy fallbacks. */
  readonly languages = computed<ReadonlyArray<string>>(() => {
    const manifest = this.campaignService.manifest();
    const activeId = this.campaignService.activeCampaignId();
    const active = manifest.find(({ id }) => id === activeId);
    const configured = active?.languages ?? [
      ...new Set(manifest.flatMap(({ languages }) => languages ?? [])),
    ];
    const values = configured.length > 0 ? configured : ['en', 'it'];
    return active === undefined ? [...new Set([...values, this.currentLanguage()])] : values;
  });

  constructor() {
    effect((): void => {
      const activeId = this.campaignService.activeCampaignId();
      const campaign = this.campaignService.manifest().find(({ id }) => id === activeId);
      const available = campaign?.languages;
      if (available?.length && !available.includes(this.currentLanguage())) {
        this.languageService.setLanguage(campaign?.defaultLanguage ?? available[0]);
      }
    });
  }

  /** Selects any language code configured by the campaign. */
  selectLanguage(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.languageService.setLanguage(select.value);
  }

  /** Human-readable native language name, falling back to the code. */
  languageName(code: string): string {
    try {
      return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code.toUpperCase();
    } catch {
      return code.toUpperCase();
    }
  }
}
