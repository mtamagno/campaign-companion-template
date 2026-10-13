/**
 * NPC detail page — shows profile, gallery for non-player characters.
 * Simpler than PC pages: no password protection, no character sheet.
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
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DataService } from '@guild/services/data.service';
import { type Npc } from '@guild/models/npc.model';
import { toDisplayUrl } from '@guild/services/imageUrl.service';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { LanguageToggleComponent } from '@guild/components/language-toggle/language-toggle.component';
import { DiceLoaderComponent } from '@guild/components/dice-loader/dice-loader.component';
import { ImageGalleryComponent } from '@guild/components/image-gallery/image-gallery.component';
import { AccordionComponent } from '@guild/components/accordion/accordion.component';

/**
 * Full NPC detail page.
 * Loads NPC by route param ID and displays profile + gallery.
 */
@Component({
  selector: 'app-npc-detail',
  standalone: true,
  imports: [
    BilingualTextPipe,
    LanguageToggleComponent,
    ImageGalleryComponent,
    AccordionComponent,
    DiceLoaderComponent,
  ],
  templateUrl: './npc-detail.component.html',
  styleUrl: './npc-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpcDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);

  /** NPC ID from route params. */
  private readonly npcId: Signal<string | undefined> = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  /** The loaded NPC data. */
  readonly npc: Signal<Npc | undefined> = computed(() => {
    const id = this.npcId();
    if (id === undefined) {
      return undefined;
    }
    return this.dataService.getNpcById(id)();
  });

  /** Whether data is still loading. */
  readonly isLoading: Signal<boolean> = this.dataService.isLoading;

  /** Whether the profile image has finished loading. */
  readonly isProfileLoaded = signal(false);

  /** Whether the portrait image has finished loading. */
  readonly isPortraitLoaded = signal(false);

  /** Resets image loading state when the NPC changes. */
  private readonly resetLoadState = effect(() => {
    this.npc();
    this.isProfileLoaded.set(false);
    this.isPortraitLoaded.set(false);
  });

  /** Display-quality profile image URL (compressed for hero section). */
  readonly displayProfileUrl: Signal<string | undefined> = computed(() => {
    const npc = this.npc();
    return npc?.profileImageUrl !== undefined ? toDisplayUrl(npc.profileImageUrl) : undefined;
  });

  /** Display-quality portrait image URL (compressed for hero section). */
  readonly displayPortraitUrl: Signal<string | undefined> = computed(() => {
    const npc = this.npc();
    return npc?.portraitImageUrl !== undefined ? toDisplayUrl(npc.portraitImageUrl) : undefined;
  });

  /** Handles profile image load error — falls back to placeholder. */
  onProfileImageError(event: Event): void {
    const img = event.target;
    if (img instanceof HTMLImageElement) {
      img.src = 'assets/images/placeholders/placeholder-portrait.svg';
    }
  }

  /** Handles full-body portrait load error — hides the frame. */
  onPortraitImageError(event: Event): void {
    const img = event.target;
    if (img instanceof HTMLImageElement) {
      const frame = img.parentElement;
      if (frame) {
        frame.style.display = 'none';
      }
    }
  }
}
