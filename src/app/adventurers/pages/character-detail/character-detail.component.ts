/**
 * Character detail page — shows public profile, private profile,
 * character sheet, gallery, and session diary for a player character.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DataService } from '@guild/services/data.service';
import { CampaignService } from '@guild/services/campaign.service';
import { DEFAULT_CHARACTER_PASSWORD, type Character } from '@guild/models/character.model';
import { type BilingualText } from '@guild/models/language.model';
import { toDisplayUrl } from '@guild/services/imageUrl.service';
import { LanguageService } from '@guild/services/language.service';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { ImageGalleryComponent } from '@guild/components/image-gallery/image-gallery.component';
import { AccordionComponent } from '@guild/components/accordion/accordion.component';
import { PrivateProfileComponent } from '../../components/private-profile/private-profile.component';
import { CharacterSheetComponent } from '../../components/character-sheet/character-sheet.component';
import { SessionDiaryComponent } from '../../components/session-diary/session-diary.component';

/**
 * Full character detail page.
 * Loads character by route param ID and displays all sections.
 */
@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [
    BilingualTextPipe,
    LanguageToggleComponent,
    ImageGalleryComponent,
    AccordionComponent,
    PrivateProfileComponent,
    CharacterSheetComponent,
    SessionDiaryComponent,
    RouterLink,
    DiceLoaderComponent,
  ],
  templateUrl: './character-detail.component.html',
  styleUrl: './character-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);

  /** Current display language for page chrome and section labels. */
  readonly lang = this.languageService.currentLanguage;

  /** Password used until a character defines a personal one in campaign data. */
  readonly defaultCharacterPassword = DEFAULT_CHARACTER_PASSWORD;

  /** Active campaign ID for building route links. */
  readonly campaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** Character ID from route params. */
  private readonly characterId: Signal<string | undefined> = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  /** The loaded character data. */
  readonly character: Signal<Character | undefined> = computed(() => {
    const id = this.characterId();
    if (id === undefined) {
      return undefined;
    }
    return this.dataService.getCharacterById(id)();
  });

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Whether the profile image has finished loading. */
  readonly isProfileLoaded = signal(false);

  /** Whether the portrait image has finished loading. */
  readonly isPortraitLoaded = signal(false);

  /** Resets image loading state when the character changes. */
  private readonly resetLoadState = effect(() => {
    this.character();
    this.isProfileLoaded.set(false);
    this.isPortraitLoaded.set(false);
  });

  /** Display-quality profile image URL (compressed for hero section). */
  readonly displayProfileUrl: Signal<string | undefined> = computed(() => {
    const char = this.character();
    return char?.profileImageUrl !== undefined ? toDisplayUrl(char.profileImageUrl) : undefined;
  });

  /** Display-quality portrait image URL (compressed for hero section). */
  readonly displayPortraitUrl: Signal<string | undefined> = computed(() => {
    const char = this.character();
    return char?.portraitImageUrl !== undefined ? toDisplayUrl(char.portraitImageUrl) : undefined;
  });

  /** Whether the sheet contains real playable values rather than placeholders. */
  readonly isCharacterReady: Signal<boolean> = computed(() => {
    const char = this.character();
    return (
      char !== undefined &&
      char.sheet.level > 0 &&
      char.sheet.maxHitPoints > 0 &&
      char.sheet.armorClass > 0
    );
  });

  /** Avoids rendering the same generic placeholder twice in the hero. */
  readonly hasDistinctPortrait: Signal<boolean> = computed(() => {
    const char = this.character();
    if (char === undefined) {
      return false;
    }
    return (
      char.portraitImageUrl !== char.profileImageUrl &&
      !char.portraitImageUrl.includes('placeholder-portrait')
    );
  });

  /** Whether at least one public-profile field contains meaningful copy. */
  readonly hasPublicProfile: Signal<boolean> = computed(() => {
    const profile = this.character()?.publicProfile;
    return (
      profile !== undefined &&
      [profile.backstory, profile.traits, profile.ideals, profile.bonds, profile.flaws].some(
        (value) => this.isRecorded(value),
      )
    );
  });

  /** Detects the shared bilingual placeholders used by not-yet-authored profiles. */
  isRecorded(value: BilingualText): boolean {
    const normalized = `${value.en} ${value.it}`.toLowerCase();
    return !normalized.includes('not yet recorded') && !normalized.includes('non ancora registrat');
  }

  /** Handles profile image (800x600) load error. */
  onProfileImageError(event: Event): void {
    const img = event.target;
    if (img instanceof HTMLImageElement) {
      img.src = 'assets/images/placeholders/placeholder-portrait.svg';
    }
  }

  /** Handles full-body portrait (1024x1536) load error. */
  onPortraitImageError(event: Event): void {
    const img = event.target;
    if (img instanceof HTMLImageElement) {
      img.src = 'assets/images/placeholders/placeholder-portrait.svg';
    }
  }
}
