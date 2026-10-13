import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
  type WritableSignal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { SidebarComponent } from '@guild/components/sidebar/sidebar.component';
import { SiteCommandBarComponent } from '@guild/components/site-command-bar/site-command-bar.component';
import { SFX } from '@guild/constants/sfx.constant';
import { AudioService } from '@guild/services/audio.service';
import { CampaignService } from '@guild/services/campaign.service';
import { LanguageService } from '@guild/services/language.service';

/**
 * CSS selectors for elements that should automatically play the default
 * click SFX when clicked anywhere in the app.
 */
const CLICK_TRIGGER_SELECTOR = 'button, a, [role="button"]';

/**
 * Walks up the DOM from `start` looking for the closest interactive
 * trigger. Bails out if it first encounters an opt-out marker
 * (`data-sfx="off"`) or an element already managed by
 * `SfxClickDirective` (to avoid double-play).
 *
 * @param start - The original event target.
 * @returns The matching trigger element, or `null` if none / opted out.
 */
function findClickTrigger(start: EventTarget | null): HTMLElement | null {
  if (!(start instanceof Element)) {
    return null;
  }
  let node: Element | null = start;
  while (node !== null) {
    if (node instanceof HTMLElement) {
      if (node.dataset['sfx'] === 'off') {
        return null;
      }
      if (node.dataset['sfxManaged'] === 'true') {
        return null;
      }
      if (node.matches(CLICK_TRIGGER_SELECTOR)) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Returns the first path segment of a URL (the part right after the
 * leading slash, before the next slash or query). Returns an empty
 * string for the root URL.
 * @param url - The URL to parse.
 */
function extractFirstSegment(url: string): string {
  const withoutQuery = url.split('?')[0].split('#')[0];
  const trimmed = withoutQuery.startsWith('/') ? withoutQuery.slice(1) : withoutQuery;
  const slash = trimmed.indexOf('/');
  return slash === -1 ? trimmed : trimmed.slice(0, slash);
}

/**
 * Root application component.
 *
 * Beyond rendering the layout, this component owns two app-wide audio
 * concerns wired in Phase B of the site restyle:
 * 1. A delegated click listener that plays a soft click SFX whenever a
 *    `<button>`, `<a>`, or `[role="button"]` is activated, unless the
 *    target opts out via `data-sfx="off"` or is already managed by
 *    `SfxClickDirective`.
 * 2. A `page-turn` SFX that fires on major route changes — i.e., when
 *    the first URL segment changes — skipping the initial navigation.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, SiteCommandBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly audio = inject(AudioService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly campaignService = inject(CampaignService);
  private readonly languageService = inject(LanguageService);
  private readonly documentTitle = inject(Title);

  protected readonly title = 'Campaign Companion';

  /** Controls mobile sidebar visibility. */
  readonly isSidebarOpen: WritableSignal<boolean> = signal(false);

  /** Active campaign ID, exposed to the template for campaign-aware theming. */
  readonly activeCampaignId = this.campaignService.activeCampaignId;

  /** Current language, used by app-shell controls outside routed pages. */
  readonly isItalian = computed((): boolean => this.languageService.currentLanguage() === 'it');

  /** Tracks the previous first-segment to detect major route changes. */
  private previousFirstSegment: string | undefined = undefined;

  ngOnInit(): void {
    this.subscribeToMajorRouteChanges();
  }

  constructor() {
    effect((): void => {
      const campaignId = this.activeCampaignId();
      const language = this.languageService.currentLanguage();
      const campaign = this.campaignService.manifest().find(({ id }) => id === campaignId);
      const campaignName = campaign?.name[language];
      this.documentTitle.setTitle(
        campaignName === undefined ? 'Campaign Companion' : `${campaignName} · Campaign Companion`,
      );
    });
  }

  /** Toggles the mobile sidebar. */
  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  /** Closes the mobile sidebar. */
  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  /** Lets keyboard users dismiss the mobile navigation consistently. */
  @HostListener('document:keydown.escape')
  closeSidebarOnEscape(): void {
    this.closeSidebar();
  }

  /**
   * App-wide click delegation. Bubbled clicks on standard interactive
   * triggers play the default click SFX.
   * @param event - The native click event.
   */
  @HostListener('click', ['$event'])
  onAppClick(event: MouseEvent): void {
    const trigger = findClickTrigger(event.target);
    if (trigger === null) {
      return;
    }
    this.audio.play(SFX.CLICK_SOFT);
  }

  /**
   * Subscribes to router events and plays `page-turn` only when the
   * first URL segment changes. The very first `NavigationEnd` after
   * bootstrap is silenced (audio is not unlocked yet anyway).
   */
  private subscribeToMajorRouteChanges(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd): void => {
        const nextSegment = extractFirstSegment(event.urlAfterRedirects);
        if (this.previousFirstSegment === undefined) {
          this.previousFirstSegment = nextSegment;
          return;
        }
        if (nextSegment !== this.previousFirstSegment) {
          this.audio.play(SFX.PAGE_TURN, { ignoreThrottle: true });
        }
        this.previousFirstSegment = nextSegment;
      });
  }
}
