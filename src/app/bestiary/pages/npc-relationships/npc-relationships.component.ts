/**
 * NPC relationships page — visual graph of NPC-to-party relationships.
 * Uses the shared RelationshipGraphComponent, combining NPC and PC nodes.
 */

import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { Router } from '@angular/router';

import { CampaignService } from '@guild/services/campaign.service';
import { DataService } from '@guild/services/data.service';
import { LanguageService } from '@guild/services/language.service';
import {
  type Relationship,
  type RelationshipNode,
  NODE_TYPES,
} from '@guild/models/relationship.model';
import { getNpcDisplayName } from '@guild/utils/npcDisplay';
import { RelationshipGraphComponent } from '@guild/components/relationship-graph/relationship-graph.component';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';

/**
 * Displays a visual graph of relationships between NPCs and party members.
 * Nodes include both PCs (gold rings) and NPCs (silver rings).
 */
@Component({
  selector: 'app-npc-relationships',
  standalone: true,
  imports: [RelationshipGraphComponent, LanguageToggleComponent, DiceLoaderComponent],
  templateUrl: './npc-relationships.component.html',
  styleUrl: './npc-relationships.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpcRelationshipsComponent {
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  /** Current language for page copy and loading states. */
  readonly lang = this.languageService.currentLanguage;

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** NPC-party relationships from the data service. */
  readonly relationships = this.dataService.npcRelationships;

  /** Graph nodes — both PCs and NPCs involved in NPC relationships. */
  readonly nodes: Signal<ReadonlyArray<RelationshipNode>> = computed(() => {
    const rels = this.relationships();
    const involvedIds = new Set<string>();
    for (const rel of rels) {
      involvedIds.add(rel.sourceId);
      involvedIds.add(rel.targetId);
    }

    const pcNodes: ReadonlyArray<RelationshipNode> = this.dataService
      .characters()
      .filter((c) => involvedIds.has(c.id))
      .map((char): RelationshipNode => ({
        id: char.id,
        name: char.name,
        avatarUrl: char.profileImageUrl,
        nodeType: NODE_TYPES.PC,
      }));

    const npcNodes: ReadonlyArray<RelationshipNode> = this.dataService
      .npcs()
      .filter((n) => involvedIds.has(n.id))
      .map((npc): RelationshipNode => ({
        id: npc.id,
        name: getNpcDisplayName(npc),
        avatarUrl: npc.profileImageUrl ?? npc.avatar.url,
        nodeType: NODE_TYPES.NPC,
      }));

    return [...pcNodes, ...npcNodes];
  });

  /**
   * Navigates to the relationship detail page when an edge is clicked.
   * @param relationship - The clicked relationship.
   */
  navigateToRelationship(relationship: Relationship): void {
    void this.router.navigate([
      '/',
      this.campaignService.activeCampaignId(),
      'relationships',
      relationship.sourceId,
      relationship.targetId,
    ]);
  }

  /**
   * Navigates to the character/NPC detail page when a node avatar is clicked.
   * Routes to party/:id for PCs, npcs/:id for NPCs.
   * @param node - The clicked graph node.
   */
  navigateToCharacter(node: RelationshipNode): void {
    const basePath = node.nodeType === NODE_TYPES.PC ? 'party' : 'npcs';
    void this.router.navigate(['/', this.campaignService.activeCampaignId(), basePath, node.id]);
  }
}
