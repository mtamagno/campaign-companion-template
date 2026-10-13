/**
 * Party relationships page — visual graph of PC-to-PC relationships.
 * Uses the shared RelationshipGraphComponent with party data.
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
import { RelationshipGraphComponent } from '@guild/components/relationship-graph/relationship-graph.component';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';

/**
 * Displays a visual graph of relationships between party members (PCs).
 * Nodes are player characters, edges are their interpersonal relationships.
 */
@Component({
  selector: 'app-party-relationships',
  standalone: true,
  imports: [RelationshipGraphComponent, LanguageToggleComponent, DiceLoaderComponent],
  templateUrl: './party-relationships.component.html',
  styleUrl: './party-relationships.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyRelationshipsComponent {
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  /** Current language for page copy and loading states. */
  readonly lang = this.languageService.currentLanguage;

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Party relationships from the data service. */
  readonly relationships = this.dataService.partyRelationships;

  /** Graph nodes built from character data. */
  readonly nodes: Signal<ReadonlyArray<RelationshipNode>> = computed(() =>
    this.dataService.characters().map((char): RelationshipNode => ({
      id: char.id,
      name: char.name,
      avatarUrl: char.profileImageUrl,
      nodeType: NODE_TYPES.PC,
    })),
  );

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
   * Navigates to the character detail page when a node avatar is clicked.
   * @param node - The clicked graph node.
   */
  navigateToCharacter(node: RelationshipNode): void {
    void this.router.navigate(['/', this.campaignService.activeCampaignId(), 'party', node.id]);
  }
}
