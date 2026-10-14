/**
 * Relationship detail page — shows the full history between two characters/NPCs.
 * Displays shared events timeline, quotes, and relationship evolution.
 * Route: /relationships/:sourceId/:targetId
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DataService } from '@guild/services/data.service';
import { LanguageService } from '@guild/services/language.service';
import { CampaignService } from '@guild/services/campaign.service';
import {
  type Relationship,
  type SharedEvent,
  type RelationshipQuote,
  type RelationshipEvolution,
  RELATIONSHIP_TYPE_LABELS,
} from '@guild/models/relationship.model';
import { type Character, type ImageRef } from '@guild/models/character.model';
import { type Npc } from '@guild/models/npc.model';
import { getNpcDisplayName } from '@guild/utils/npcDisplay';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { localizeText } from '@guild/models/language.model';

/** Resolved entity info for display in the header. */
interface EntityInfo {
  readonly id: string;
  readonly name: string;
  readonly avatar: ImageRef;
  readonly profileImageUrl: string | undefined;
}

/**
 * Shows the detailed history of a relationship between two entities.
 * Loads data from route params :sourceId and :targetId.
 */
@Component({
  selector: 'app-relationship-detail',
  standalone: true,
  imports: [RouterLink, BilingualTextPipe, LanguageToggleComponent, DiceLoaderComponent],
  templateUrl: './relationship-detail.component.html',
  styleUrl: './relationship-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelationshipDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly languageService = inject(LanguageService);
  private readonly campaignService = inject(CampaignService);

  /** Active campaign ID for building route links. */
  readonly campaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** Source entity ID from route. */
  private readonly sourceId: Signal<string | undefined> = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('sourceId') ?? undefined)),
  );

  /** Target entity ID from route. */
  private readonly targetId: Signal<string | undefined> = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('targetId') ?? undefined)),
  );

  /** The relationship data. */
  readonly relationship: Signal<Relationship | undefined> = computed(() => {
    const source = this.sourceId();
    const target = this.targetId();
    if (source === undefined || target === undefined) {
      return undefined;
    }
    return this.dataService.getRelationshipBetween(source, target)();
  });

  /** Localized relationship type label. */
  readonly relationshipTypeLabel: Signal<string> = computed(() => {
    const rel = this.relationship();
    if (rel === undefined) {
      return '';
    }
    const label = RELATIONSHIP_TYPE_LABELS[rel.type];
    return localizeText(label, this.languageService.currentLanguage());
  });

  /** Source entity info (character or NPC). */
  readonly sourceEntity: Signal<EntityInfo | undefined> = computed(() => {
    const rel = this.relationship();
    if (rel === undefined) {
      return undefined;
    }
    return this.resolveEntity(rel.sourceId);
  });

  /** Target entity info (character or NPC). */
  readonly targetEntity: Signal<EntityInfo | undefined> = computed(() => {
    const rel = this.relationship();
    if (rel === undefined) {
      return undefined;
    }
    return this.resolveEntity(rel.targetId);
  });

  /** Shared events, if any. */
  readonly sharedEvents: Signal<ReadonlyArray<SharedEvent>> = computed(
    () => this.relationship()?.sharedEvents ?? [],
  );

  /** Quotes, if any. */
  readonly quotes: Signal<ReadonlyArray<RelationshipQuote>> = computed(
    () => this.relationship()?.quotes ?? [],
  );

  /** Evolution notes, if any. */
  readonly evolution: Signal<ReadonlyArray<RelationshipEvolution>> = computed(
    () => this.relationship()?.evolution ?? [],
  );

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /**
   * Resolves the name of a speaker by their entity ID.
   * @param speakerId - The entity ID of the speaker.
   * @returns The entity's display name.
   */
  getSpeakerName(speakerId: string): string {
    const entity = this.resolveEntity(speakerId);
    return entity?.name ?? speakerId;
  }

  /**
   * Formats a relationship type for bilingual display.
   * @param type - The relationship type to format.
   * @returns Localized type label.
   */
  formatEvolutionType(type: string): string {
    const labels = RELATIONSHIP_TYPE_LABELS;
    const label = labels[type as keyof typeof labels];
    if (label === undefined) {
      return type;
    }
    return localizeText(label, this.languageService.currentLanguage());
  }

  /**
   * Resolves an entity ID to its display info (name + avatar).
   * Searches both characters and NPCs.
   * @param entityId - The character or NPC ID.
   * @returns Entity info or undefined if not found.
   */
  private resolveEntity(entityId: string): EntityInfo | undefined {
    const character: Character | undefined = this.dataService.getCharacterById(entityId)();
    if (character !== undefined) {
      return {
        id: character.id,
        name: character.name,
        avatar: character.avatar,
        profileImageUrl: character.profileImageUrl,
      };
    }

    const npc: Npc | undefined = this.dataService.getNpcById(entityId)();
    if (npc !== undefined) {
      return {
        id: npc.id,
        name: getNpcDisplayName(npc, this.languageService.currentLanguage()),
        avatar: npc.avatar,
        profileImageUrl: npc.profileImageUrl,
      };
    }

    return undefined;
  }
}
