/**
 * Character sheet section — password-protected fantasy RPG stats.
 * Displays ability scores, skills, equipment, and features.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  computed,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PasswordService } from '@guild/services/password.service';
import {
  type CharacterPublicProfile,
  type CharacterSheet as CharacterSheetModel,
  type CharacterSheetSnapshot,
} from '@guild/models/character.model';
import { LanguageService } from '@guild/services/language.service';
import { PasswordDialogComponent } from '@guild/components/password-dialog/password-dialog.component';
import { SPELL_CATEGORIES } from '@arcana/constants/spells.constants';
import { SPELL_SCHOOLS, isSpellEntry, type SpellEntry } from '@arcana/models/compendium.model';
import { CharacterSheetHistoryComponent } from '../character-sheet-history/character-sheet-history.component';
import { CharacterSheetNavigationComponent } from '../character-sheet-navigation/character-sheet-navigation.component';

interface AbilityScoreEntry {
  readonly name: string;
  readonly value: number;
  readonly modifier: string;
}

interface CurrencyEntry {
  readonly code: string;
  readonly value: number;
  readonly label: string;
}

interface CharacterSpellCard {
  readonly name: string;
  readonly originalName: string;
  readonly categoryId?: string;
  readonly key?: string;
  readonly level?: number;
  readonly school?: string;
  readonly castingTime?: string;
  readonly range?: string;
  readonly duration?: string;
  readonly description?: string;
  readonly isConcentration: boolean;
  readonly isRitual: boolean;
}

interface CharacterSpellGroup {
  readonly level?: number;
  readonly label: string;
  readonly spells: ReadonlyArray<CharacterSpellCard>;
}

interface SpellcastingSummary {
  readonly ability: string;
  readonly saveDC: number;
  readonly attackBonus: string;
}

/**
 * Displays a fantasy RPG character sheet behind password protection.
 * Shares unlock state with PrivateProfileComponent via PasswordService.
 */
@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    PasswordDialogComponent,
    CharacterSheetHistoryComponent,
    CharacterSheetNavigationComponent,
  ],
  templateUrl: './character-sheet.component.html',
  styleUrl: './character-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetComponent {
  private readonly passwordService = inject(PasswordService);
  private readonly languageService = inject(LanguageService);

  /** Whether the current interface language is Italian. */
  readonly isItalian = computed(() => this.languageService.currentLanguage() === 'it');

  /** Character ID for password state tracking. */
  readonly characterId = input.required<string>();

  /** Character name for dialog display. */
  readonly characterName = input.required<string>();

  /** The latest character sheet, exposed to templates through the selected snapshot. */
  // The alias keeps the public template binding concise while distinguishing
  // the input from the selected historical sheet exposed below.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly currentSheet = input.required<CharacterSheetModel>({ alias: 'sheet' });

  /** Immutable sheets preserved from earlier levels. */
  readonly sheetHistory = input<ReadonlyArray<CharacterSheetSnapshot>>([]);

  /** Public lore included in the printable character dossier. */
  readonly publicProfile = input<CharacterPublicProfile>();

  /** Character artwork included in the printable character dossier. */
  readonly profileImageUrl = input<string>();
  readonly portraitImageUrl = input<string>();

  /** Explicitly selected archived level; undefined means the latest sheet. */
  readonly selectedLevel: WritableSignal<number | undefined> = signal(undefined);

  /** Complete chronological timeline, with the latest sheet always included. */
  readonly sheetSnapshots: Signal<ReadonlyArray<CharacterSheetSnapshot>> = computed(() => {
    const current = this.currentSheet();
    const snapshotsByLevel = new Map<number, CharacterSheetSnapshot>(
      this.sheetHistory().map((snapshot) => [snapshot.sheet.level, snapshot]),
    );
    const existingCurrent = snapshotsByLevel.get(current.level);
    snapshotsByLevel.set(current.level, {
      ...existingCurrent,
      sheet: current,
    });
    return [...snapshotsByLevel.values()].sort((a, b) => a.sheet.level - b.sheet.level);
  });

  /** Sheet shown on screen and exported to PDF. */
  readonly sheet: Signal<CharacterSheetModel> = computed(() => {
    const requestedLevel = this.selectedLevel();
    return (
      this.sheetSnapshots().find((snapshot) => snapshot.sheet.level === requestedLevel)?.sheet ??
      this.currentSheet()
    );
  });

  /** Metadata belonging to the selected sheet snapshot. */
  readonly activeSnapshot: Signal<CharacterSheetSnapshot | undefined> = computed(() =>
    this.sheetSnapshots().find((snapshot) => snapshot.sheet.level === this.sheet().level),
  );

  /** The stored password to verify against. */
  readonly password = input.required<string>();

  /** Whether the password dialog is currently open. */
  readonly isDialogOpen: WritableSignal<boolean> = signal(false);

  /** Whether the last password attempt was incorrect. */
  readonly hasPasswordError: WritableSignal<boolean> = signal(false);

  /** Whether the printable PDF is currently being generated. */
  readonly isGeneratingPdf: WritableSignal<boolean> = signal(false);

  /** User-facing error raised if PDF generation fails. */
  readonly pdfError: WritableSignal<boolean> = signal(false);

  /** Whether this character is already unlocked. */
  readonly isUnlocked: Signal<boolean> = computed(() =>
    this.passwordService.isUnlocked(this.characterId())(),
  );

  /** Whether the character sheet is empty (not yet compiled). */
  readonly isSheetEmpty: Signal<boolean> = computed(() => {
    const sheetData = this.sheet();
    return sheetData.level === 0 && sheetData.maxHitPoints === 0;
  });

  /** Formatted ability scores for display. */
  readonly abilityScoreEntries: Signal<ReadonlyArray<AbilityScoreEntry>> = computed(() => {
    const scores = this.sheet().abilityScores;
    return [
      { name: 'STR', value: scores.strength, modifier: this.formatModifier(scores.strength) },
      { name: 'DEX', value: scores.dexterity, modifier: this.formatModifier(scores.dexterity) },
      {
        name: 'CON',
        value: scores.constitution,
        modifier: this.formatModifier(scores.constitution),
      },
      {
        name: 'INT',
        value: scores.intelligence,
        modifier: this.formatModifier(scores.intelligence),
      },
      { name: 'WIS', value: scores.wisdom, modifier: this.formatModifier(scores.wisdom) },
      { name: 'CHA', value: scores.charisma, modifier: this.formatModifier(scores.charisma) },
    ];
  });

  /** Initiative derived from Dexterity. */
  readonly initiativeModifier: Signal<string> = computed(() =>
    this.formatModifier(this.sheet().abilityScores.dexterity),
  );

  /** Passive Perception, including proficiency when Perception is listed. */
  readonly passivePerception: Signal<number> = computed(() => {
    const data = this.sheet();
    const wisdomModifier = this.modifierValue(data.abilityScores.wisdom);
    const hasProficiency = data.skills.some((skill) => {
      const normalized = this.normalizeSpellName(skill);
      return normalized === 'perception' || normalized === 'percezione';
    });
    return 10 + wisdomModifier + (hasProficiency ? data.proficiencyBonus : 0);
  });

  /** Structured currency displayed in the top summary rather than inventory. */
  readonly currencyEntries: Signal<ReadonlyArray<CurrencyEntry>> = computed(() => {
    const currency = this.sheet().currency;
    if (currency === undefined) return [];
    const values: ReadonlyArray<CurrencyEntry> = [
      { code: 'PP', value: currency.pp ?? 0, label: this.isItalian() ? 'Platino' : 'Platinum' },
      { code: 'GP', value: currency.gp ?? 0, label: this.isItalian() ? 'Oro' : 'Gold' },
      { code: 'EP', value: currency.ep ?? 0, label: this.isItalian() ? 'Elettro' : 'Electrum' },
      { code: 'SP', value: currency.sp ?? 0, label: this.isItalian() ? 'Argento' : 'Silver' },
      { code: 'CP', value: currency.cp ?? 0, label: this.isItalian() ? 'Rame' : 'Copper' },
    ];
    return values.filter((entry) => entry.value > 0);
  });

  /** Spellcasting values, using explicit data or deriving them from the chosen ability. */
  readonly spellcastingSummary: Signal<SpellcastingSummary | undefined> = computed(() => {
    const data = this.sheet();
    const config = data.spellcasting;
    if (config === undefined) return undefined;
    const score = data.abilityScores[config.ability];
    const modifier = this.modifierValue(score);
    return {
      ability: this.abilityLabel(config.ability),
      saveDC: config.spellSaveDC ?? 8 + data.proficiencyBonus + modifier,
      attackBonus: this.formatSignedNumber(
        config.spellAttackBonus ?? data.proficiencyBonus + modifier,
      ),
    };
  });

  /** Prepared/known spells enriched with data and links from the local compendium. */
  readonly spellGroups: Signal<ReadonlyArray<CharacterSpellGroup>> = computed(() => {
    const spellNames = this.sheet().spells ?? [];
    const cards = spellNames.map((spellName) => this.resolveSpell(spellName));
    const levels = [...new Set(cards.map((spell) => spell.level))].sort(
      (a, b) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER),
    );

    return levels.map((level) => ({
      level,
      label:
        level === undefined
          ? this.isItalian()
            ? 'Altri incantesimi'
            : 'Other spells'
          : level === 0
            ? this.isItalian()
              ? 'Trucchetti'
              : 'Cantrips'
            : this.isItalian()
              ? `Incantesimi di ${level}° livello`
              : `Level ${level} spells`,
      spells: cards.filter((spell) => spell.level === level),
    }));
  });

  /** Opens the password dialog. */
  openDialog(): void {
    this.hasPasswordError.set(false);
    this.isDialogOpen.set(true);
  }

  /** Closes the password dialog. */
  closeDialog(): void {
    this.isDialogOpen.set(false);
    this.hasPasswordError.set(false);
  }

  /**
   * Attempts to unlock with the provided password.
   * @param inputPassword - The password entered by the user.
   */
  onPasswordSubmit(inputPassword: string): void {
    const success = this.passwordService.unlock(this.characterId(), inputPassword, this.password());

    if (success) {
      this.isDialogOpen.set(false);
      this.hasPasswordError.set(false);
    } else {
      this.hasPasswordError.set(true);
    }
  }

  /** Opens a preserved version of the sheet without affecting the latest data. */
  selectSheetLevel(level: number): void {
    this.selectedLevel.set(level === this.currentSheet().level ? undefined : level);
  }

  /** Returns from an archived sheet to the character's latest level. */
  showCurrentSheet(): void {
    this.selectedLevel.set(undefined);
  }

  /** Scrolls to a section without causing an Angular route navigation. */
  scrollToSection(section: string): void {
    document
      .getElementById(`character-sheet-${section}-${this.characterId()}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Builds and downloads a three-page illustrated PDF in the active language. */
  async downloadPdf(): Promise<void> {
    if (this.isGeneratingPdf()) return;

    this.isGeneratingPdf.set(true);
    this.pdfError.set(false);
    try {
      const { generateCampaignCharacterSheetPdf } =
        await import('../../services/campaignCharacterSheetPdf.service');
      const language = this.isItalian() ? 'it' : 'en';
      const blob = await generateCampaignCharacterSheetPdf(
        this.characterName(),
        this.sheet(),
        language,
        {
          publicProfile: this.publicProfile(),
          profileImageUrl: this.profileImageUrl(),
          portraitImageUrl: this.portraitImageUrl(),
          chapterTitle: this.activeSnapshot()?.title,
          recordedAt: this.activeSnapshot()?.recordedAt,
        },
      );
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${this.slugify(this.characterName())}-level-${this.sheet().level}-character-sheet-${language}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      this.pdfError.set(true);
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  /**
   * Calculates the ability modifier from an ability score.
   * @param score - The raw ability score (1-30).
   * @returns Formatted modifier string (e.g. "+2", "-1").
   */
  private formatModifier(score: number): string {
    return this.formatSignedNumber(this.modifierValue(score));
  }

  private modifierValue(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  private formatSignedNumber(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  private abilityLabel(ability: keyof CharacterSheetModel['abilityScores']): string {
    const labels: Record<keyof CharacterSheetModel['abilityScores'], readonly [string, string]> = {
      strength: ['STR', 'FOR'],
      dexterity: ['DEX', 'DES'],
      constitution: ['CON', 'COS'],
      intelligence: ['INT', 'INT'],
      wisdom: ['WIS', 'SAG'],
      charisma: ['CHA', 'CAR'],
    };
    return labels[ability][this.isItalian() ? 1 : 0];
  }

  private resolveSpell(originalName: string): CharacterSpellCard {
    const normalizedName = this.normalizeSpellName(originalName);
    for (const category of SPELL_CATEGORIES) {
      const entry = category.entries.find((candidate) => {
        if (!isSpellEntry(candidate)) return false;
        const englishName = this.normalizeSpellName(candidate.en);
        const italianName = this.normalizeSpellName(candidate.it);
        return (
          englishName === normalizedName ||
          italianName === normalizedName ||
          englishName.endsWith(normalizedName)
        );
      });
      if (entry !== undefined && isSpellEntry(entry)) {
        return this.toSpellCard(originalName, category.id, entry);
      }
    }

    return {
      name: originalName,
      originalName,
      isConcentration: false,
      isRitual: false,
    };
  }

  private toSpellCard(
    originalName: string,
    categoryId: string,
    spell: SpellEntry,
  ): CharacterSpellCard {
    const italian = this.isItalian();
    const school = SPELL_SCHOOLS[spell.school] ?? { en: spell.school, it: spell.school };
    return {
      name: italian ? spell.it : spell.en,
      originalName,
      categoryId,
      key: spell.key,
      level: spell.level,
      school: italian ? school.it : school.en,
      castingTime: italian ? spell.castingTimeIt : spell.castingTimeEn,
      range: italian ? spell.rangeIt : spell.rangeEn,
      duration: italian ? spell.durationIt : spell.durationEn,
      description: italian ? spell.descriptionIt : spell.descriptionEn,
      isConcentration: spell.isConcentration,
      isRitual: spell.isRitual,
    };
  }

  private normalizeSpellName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private slugify(value: string): string {
    return this.normalizeSpellName(value).replace(/\s+/g, '-');
  }
}
