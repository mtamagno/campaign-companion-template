import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-character-sheet-navigation',
  standalone: true,
  templateUrl: './character-sheet-navigation.component.html',
  styleUrl: './character-sheet-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetNavigationComponent {
  readonly characterId = input.required<string>();
  readonly isItalian = input(false);
  readonly hasEquipment = input(false);
  readonly hasSpells = input(false);
  readonly selectedLevel = input.required<number>();
  readonly currentLevel = input.required<number>();
  readonly currentRequested = output<void>();
  readonly sectionRequested = output<string>();
}
