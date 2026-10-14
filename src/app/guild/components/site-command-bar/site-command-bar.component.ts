import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

import { CampaignService } from '@guild/services/campaign.service';
import { LanguageService } from '@guild/services/language.service';
import { localizeText } from '@guild/models/language.model';

interface NavigationCommand {
  readonly icon: string;
  readonly title: string;
  readonly detail: string;
  readonly url: string;
  readonly keywords: string;
}

interface BreadcrumbItem {
  readonly label: string;
  readonly url: string;
}

const ROUTE_LABELS: Readonly<Record<string, { readonly it: string; readonly en: string }>> = {
  party: { it: 'Compagnia', en: 'Party' },
  relationships: { it: 'Relazioni', en: 'Relationships' },
  npcs: { it: 'PNG', en: 'NPCs' },
  campaign: { it: 'Campagna', en: 'Campaign' },
  'story-so-far': { it: 'La storia fin qui', en: 'Story so far' },
  story: { it: 'Cronache', en: 'Chronicles' },
  maps: { it: 'Luoghi', en: 'Places' },
  gallery: { it: 'Galleria', en: 'Gallery' },
};

function humanizeSegment(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter): string => letter.toUpperCase());
}

/** Persistent wayfinding and keyboard-first navigation for the entire site. */
@Component({
  selector: 'app-site-command-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-command-bar.component.html',
  styleUrl: './site-command-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteCommandBarComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly campaigns = inject(CampaignService);
  private readonly language = inject(LanguageService);
  private readonly currentUrl = signal(this.router.url);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly isOpen = signal(false);
  readonly query = signal('');
  readonly isItalian = this.language.isItalian;
  readonly activeCampaignId = this.campaigns.activeCampaignId;

  readonly activeCampaignName = computed((): string | undefined => {
    const campaignId = this.activeCampaignId();
    const lang = this.language.currentLanguage();
    return localizeText(this.campaigns.manifest().find(({ id }) => id === campaignId)?.name, lang);
  });

  readonly breadcrumbs = computed((): ReadonlyArray<BreadcrumbItem> => {
    const lang = this.language.currentLanguage();
    const cleanUrl = this.currentUrl().split(/[?#]/)[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    const items: Array<BreadcrumbItem> = [
      { label: lang === 'it' ? 'Campagne' : 'Campaigns', url: '/' },
    ];
    let path = '';

    segments.forEach((segment, index): void => {
      path += `/${segment}`;
      const campaign =
        index === 0 ? this.campaigns.manifest().find(({ id }) => id === segment) : undefined;
      const mapped = ROUTE_LABELS[segment];
      items.push({
        label:
          (campaign === undefined ? undefined : localizeText(campaign.name, lang)) ||
          mapped?.[lang === 'it' ? 'it' : 'en'] ||
          humanizeSegment(segment),
        url: path,
      });
    });
    return items;
  });

  readonly commands = computed((): ReadonlyArray<NavigationCommand> => {
    const it = this.isItalian();
    const activeId = this.activeCampaignId();
    const activeName = this.activeCampaignName();
    const global: Array<NavigationCommand> = [
      {
        icon: '\u2302',
        title: it ? 'Tutte le campagne' : 'All campaigns',
        detail: it ? 'Torna al registro delle avventure' : 'Return to the adventure ledger',
        url: '/',
        keywords: 'home campaigns campagne registro',
      },
    ];
    const lang = this.language.currentLanguage();
    const campaignEntries = this.campaigns.manifest().map((campaign): NavigationCommand => ({
      icon: '\u2691',
      title: localizeText(campaign.name, lang),
      detail: localizeText(campaign.status, lang) || (it ? 'Campagna' : 'Campaign'),
      url: `/${campaign.id}`,
      keywords: `${campaign.id} ${Object.values(campaign.description).join(' ')}`,
    }));

    if (activeId === undefined || activeName === undefined) {
      return [...campaignEntries, ...global];
    }
    const prefix = `/${activeId}`;
    const campaignCommands: Array<NavigationCommand> = [
      {
        icon: '\u2605',
        title: activeName,
        detail: it ? 'Panoramica della campagna' : 'Campaign overview',
        url: prefix,
        keywords: 'home overview panoramica',
      },
      {
        icon: '\u2694',
        title: it ? 'La compagnia' : 'The party',
        detail: it ? 'Eroi, profili e diari' : 'Heroes, profiles and journals',
        url: `${prefix}/party`,
        keywords: 'party compagnia characters personaggi heroes eroi',
      },
      {
        icon: '\u26af',
        title: it ? 'Legami del gruppo' : 'Party bonds',
        detail: it ? 'Affinit\u00e0 e tensioni' : 'Affinities and tensions',
        url: `${prefix}/party/relationships`,
        keywords: 'party relationships bonds relazioni legami',
      },
      {
        icon: '\u265f',
        title: it ? 'Volti conosciuti' : 'Known figures',
        detail: it ? 'Alleati, nemici e PNG' : 'Allies, enemies and NPCs',
        url: `${prefix}/npcs`,
        keywords: 'npc png allies enemies alleati nemici',
      },
      {
        icon: '\u270e',
        title: it ? 'Cronache della campagna' : 'Campaign chronicles',
        detail: it ? 'Eventi e storia fin qui' : 'Events and story so far',
        url: `${prefix}/campaign`,
        keywords: 'campaign storia story events eventi chronicle cronache',
      },
      {
        icon: '\u2316',
        title: it ? 'Luoghi esplorati' : 'Explored places',
        detail: it ? 'Mappe e destinazioni' : 'Maps and destinations',
        url: `${prefix}/maps`,
        keywords: 'maps mappe places luoghi locations',
      },
      {
        icon: '\u25c7',
        title: it ? 'Galleria' : 'Gallery',
        detail: it ? 'Immagini e ricordi' : 'Images and memories',
        url: `${prefix}/gallery`,
        keywords: 'gallery galleria images immagini',
      },
    ];
    return [...campaignCommands, ...global];
  });

  readonly filteredCommands = computed((): ReadonlyArray<NavigationCommand> => {
    const query = this.query().trim().toLocaleLowerCase();
    if (query.length === 0) {
      return this.commands().slice(0, 9);
    }
    return this.commands()
      .filter((command): boolean =>
        `${command.title} ${command.detail} ${command.keywords}`
          .toLocaleLowerCase()
          .includes(query),
      )
      .slice(0, 12);
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event): void => this.currentUrl.set(event.urlAfterRedirects));
  }

  open(): void {
    this.query.set('');
    this.isOpen.set(true);
    setTimeout((): void => this.searchInput()?.nativeElement.focus());
  }

  close(): void {
    this.isOpen.set(false);
    this.query.set('');
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  navigate(url: string): void {
    this.close();
    void this.router.navigateByUrl(url);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
      event.preventDefault();
      this.isOpen() ? this.close() : this.open();
    } else if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
}
