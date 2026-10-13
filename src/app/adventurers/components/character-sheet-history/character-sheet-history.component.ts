import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { type CharacterSheet, type CharacterSheetSnapshot } from '@guild/models/character.model';

interface EvolutionChange {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

@Component({
  selector: 'app-character-sheet-history',
  standalone: true,
  templateUrl: './character-sheet-history.component.html',
  styleUrl: './character-sheet-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetHistoryComponent {
  readonly snapshots = input.required<ReadonlyArray<CharacterSheetSnapshot>>();
  readonly selectedLevel = input.required<number>();
  readonly currentLevel = input.required<number>();
  readonly isItalian = input(false);
  readonly levelSelected = output<number>();

  readonly selectedSnapshot = computed(() =>
    this.snapshots().find((snapshot) => snapshot.sheet.level === this.selectedLevel()),
  );

  readonly isCurrentSelection = computed(() => this.selectedLevel() === this.currentLevel());

  readonly levelRange = computed(() => {
    const snapshots = this.snapshots();
    if (snapshots.length === 0) return '';
    const first = snapshots[0].sheet.level;
    const last = snapshots[snapshots.length - 1].sheet.level;
    return first === last ? `${first}` : `${first}-${last}`;
  });

  readonly changes = computed<ReadonlyArray<EvolutionChange>>(() => {
    const snapshots = this.snapshots();
    const selectedIndex = snapshots.findIndex(
      (snapshot) => snapshot.sheet.level === this.selectedLevel(),
    );
    if (selectedIndex <= 0) return [];

    const previous = snapshots[selectedIndex - 1].sheet;
    const current = snapshots[selectedIndex].sheet;
    return this.describeChanges(previous, current);
  });

  selectLevel(level: number): void {
    this.levelSelected.emit(level);
  }

  private describeChanges(
    previous: CharacterSheet,
    current: CharacterSheet,
  ): ReadonlyArray<EvolutionChange> {
    const changes: EvolutionChange[] = [];
    const italian = this.isItalian();

    this.addNumericChange(changes, 'XP', previous.experiencePoints, current.experiencePoints);
    this.addNumericChange(
      changes,
      italian ? 'Punti ferita' : 'Hit points',
      previous.maxHitPoints,
      current.maxHitPoints,
    );
    this.addNumericChange(
      changes,
      italian ? 'Classe armatura' : 'Armor class',
      previous.armorClass,
      current.armorClass,
    );
    this.addNumericChange(
      changes,
      italian ? 'Competenza' : 'Proficiency',
      previous.proficiencyBonus,
      current.proficiencyBonus,
    );
    this.addNumericChange(changes, italian ? 'Velocità' : 'Speed', previous.speed, current.speed);

    const abilityLabels: ReadonlyArray<
      readonly [keyof CharacterSheet['abilityScores'], string, string]
    > = [
      ['strength', 'FOR', 'STR'],
      ['dexterity', 'DES', 'DEX'],
      ['constitution', 'COS', 'CON'],
      ['intelligence', 'INT', 'INT'],
      ['wisdom', 'SAG', 'WIS'],
      ['charisma', 'CAR', 'CHA'],
    ];
    for (const [ability, labelIt, labelEn] of abilityLabels) {
      this.addNumericChange(
        changes,
        italian ? labelIt : labelEn,
        previous.abilityScores[ability],
        current.abilityScores[ability],
      );
    }

    const newFeatures = this.countNewEntries(previous.features, current.features);
    if (newFeatures > 0) {
      changes.push({
        label: italian ? 'Nuovi privilegi' : 'New features',
        value: `+${newFeatures}`,
        detail: this.newEntries(previous.features, current.features).join(' · '),
      });
    }

    const newSpells = this.countNewEntries(previous.spells ?? [], current.spells ?? []);
    if (newSpells > 0) {
      changes.push({
        label: italian ? 'Nuovi incantesimi' : 'New spells',
        value: `+${newSpells}`,
        detail: this.newEntries(previous.spells ?? [], current.spells ?? []).join(' · '),
      });
    }

    const newSkills = this.countNewEntries(previous.skills, current.skills);
    if (newSkills > 0) {
      changes.push({
        label: italian ? 'Nuove abilità' : 'New skills',
        value: `+${newSkills}`,
        detail: this.newEntries(previous.skills, current.skills).join(' · '),
      });
    }

    const newEquipment = this.countNewEntries(previous.equipment, current.equipment);
    if (newEquipment > 0) {
      changes.push({
        label: italian ? 'Nuove dotazioni' : 'New gear',
        value: `+${newEquipment}`,
        detail: this.newEntries(previous.equipment, current.equipment).join(' · '),
      });
    }

    return changes;
  }

  private addNumericChange(
    changes: EvolutionChange[],
    label: string,
    previous: number,
    current: number,
  ): void {
    const delta = current - previous;
    if (delta === 0) return;
    changes.push({ label, value: delta > 0 ? `+${delta}` : String(delta) });
  }

  private countNewEntries(previous: ReadonlyArray<string>, current: ReadonlyArray<string>): number {
    return this.newEntries(previous, current).length;
  }

  private newEntries(
    previous: ReadonlyArray<string>,
    current: ReadonlyArray<string>,
  ): ReadonlyArray<string> {
    const existing = new Set(previous.map((entry) => entry.toLocaleLowerCase()));
    return current.filter((entry) => !existing.has(entry.toLocaleLowerCase()));
  }
}
