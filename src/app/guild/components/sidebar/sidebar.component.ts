/**
 * Main sidebar navigation component.
 * Displays party members, NPCs, and section links with fantasy styling.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
  signal,
  type Signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AudioToggleComponent } from '@guild/components/audio-toggle/audio-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { DataService } from '@guild/services/data.service';
import { CampaignService } from '@guild/services/campaign.service';
import { type Character } from '@guild/models/character.model';
import { type Npc } from '@guild/models/npc.model';
import { LanguageService } from '@guild/services/language.service';
import { localizeText } from '@guild/models/language.model';

/** Simple group of NPCs by category for the sidebar. */
interface NpcCategoryGroup {
  readonly category: string;
  readonly npcs: ReadonlyArray<Npc>;
}

/**
 * Groups NPCs by their category field.
 * @param npcs - The full NPC list.
 * @returns Array of category groups, sorted alphabetically by category name.
 */
function groupNpcsByCategory(npcs: ReadonlyArray<Npc>): ReadonlyArray<NpcCategoryGroup> {
  const categoryMap = new Map<string, Array<Npc>>();

  for (const npc of npcs) {
    const category = npc.category ?? 'Other';
    const existing = categoryMap.get(category);
    if (existing) {
      existing.push(npc);
    } else {
      categoryMap.set(category, [npc]);
    }
  }

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, npcs]): NpcCategoryGroup => ({ category, npcs }));
}

/**
 * Sidebar navigation with character lists and section links.
 * Shows PC avatars and names, NPC avatars and names, and section navigation.
 * Collapsible on mobile via hamburger toggle.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AudioToggleComponent, DiceLoaderComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly dataService = inject(DataService);
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);

  /** Active campaign ID for building route links. */
  readonly activeCampaignId: Signal<string | undefined> = this.campaignService.activeCampaignId;

  /** Campaign title from loaded data, or fallback for sidebar header. */
  readonly campaignTitle: Signal<string> = computed(() => {
    const campaign = this.dataService.campaign();
    if (campaign === undefined) {
      return 'Campaign Companion';
    }
    return localizeText(campaign.name, this.languageService.currentLanguage());
  });

  /** All player characters for the party section. */
  readonly characters: Signal<ReadonlyArray<Character>> = this.dataService.characters;

  /** All NPCs for the bestiary section. */
  readonly npcs: Signal<ReadonlyArray<Npc>> = this.dataService.npcs;

  /** Whether the sidebar is open on mobile (controlled by parent). */
  readonly isOpen = input<boolean>(false);

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Count of alive NPCs for display. */
  readonly aliveNpcCount: Signal<number> = computed(
    () => this.npcs().filter((n) => n.isAlive).length,
  );

  /** Prevents linking to a fabricated chapter before the first session exists. */
  readonly hasSessions: Signal<boolean> = computed(() => this.dataService.sessions().length > 0);

  /** NPCs grouped by category for the sidebar. Minor NPCs are excluded here but remain listed in the full NPC page. */
  readonly npcGroups: Signal<ReadonlyArray<NpcCategoryGroup>> = computed(() =>
    groupNpcsByCategory(this.npcs().filter((n) => n.isMinor !== true)),
  );

  /** Set of open NPC category toggles. */
  readonly openNpcCategories = signal<ReadonlySet<string>>(new Set());

  /** Whether Italian is the active language. */
  readonly isItalian = computed((): boolean => this.languageService.currentLanguage() === 'it');

  /** Route to the latest story chapter (last session by number). */
  readonly latestChapterRoute: Signal<ReadonlyArray<string>> = computed(
    (): ReadonlyArray<string> => {
      const campaignId = this.activeCampaignId();
      if (campaignId === undefined) {
        return ['/'];
      }
      const sessions = this.dataService.sortedSessions();
      const lastSession = sessions[sessions.length - 1];
      return lastSession
        ? ['/', campaignId, 'campaign', 'story', lastSession.id]
        : ['/', campaignId, 'campaign'];
    },
  );

  /** Emitted when the sidebar requests to be closed (close button, link click). */
  readonly sidebarClose = output<void>();

  /** Toggles an NPC category section open/closed. */
  toggleNpcCategory(category: string): void {
    this.openNpcCategories.update((current): ReadonlySet<string> => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  /** Checks if an NPC category section is currently open. */
  isNpcCategoryOpen(category: string): boolean {
    return this.openNpcCategories().has(category);
  }

  /** Closes the sidebar by emitting to parent. */
  close(): void {
    this.sidebarClose.emit();
  }

  /**
   * Extracts initials from a character/NPC name for avatar fallback.
   * @param name - The full name to extract initials from.
   * @returns Up to 2 uppercase initials.
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }
}
