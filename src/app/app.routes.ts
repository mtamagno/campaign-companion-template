import { type Routes } from '@angular/router';

import { spoilerConsentGuard } from './guild/guards/spoilerConsent.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./guild/pages/campaign-selector/campaign-selector.component').then(
        (m) => m.CampaignSelectorComponent,
      ),
  },
  {
    path: ':campaignId',
    canActivate: [spoilerConsentGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./guild/pages/homepage/homepage.component').then((m) => m.HomepageComponent),
      },
      {
        path: 'party',
        pathMatch: 'full',
        loadComponent: () =>
          import('./adventurers/pages/party-list/party-list.component').then(
            (m) => m.PartyListComponent,
          ),
      },
      {
        path: 'party/relationships',
        loadComponent: () =>
          import('./adventurers/pages/party-relationships/party-relationships.component').then(
            (m) => m.PartyRelationshipsComponent,
          ),
      },
      {
        path: 'party/:id',
        loadComponent: () =>
          import('./adventurers/pages/character-detail/character-detail.component').then(
            (m) => m.CharacterDetailComponent,
          ),
      },
      {
        path: 'npcs',
        loadComponent: () =>
          import('./bestiary/pages/npc-list/npc-list.component').then((m) => m.NpcListComponent),
      },
      {
        path: 'npcs/relationships',
        loadComponent: () =>
          import('./bestiary/pages/npc-relationships/npc-relationships.component').then(
            (m) => m.NpcRelationshipsComponent,
          ),
      },
      {
        path: 'npcs/:id',
        loadComponent: () =>
          import('./bestiary/pages/npc-detail/npc-detail.component').then(
            (m) => m.NpcDetailComponent,
          ),
      },
      {
        path: 'campaign',
        loadComponent: () =>
          import('./chronicle/pages/campaign-overview/campaign-overview.component').then(
            (m) => m.CampaignOverviewComponent,
          ),
      },
      {
        path: 'campaign/story-so-far',
        loadComponent: () =>
          import('./chronicle/pages/story-so-far/story-so-far.component').then(
            (m) => m.StorySoFarComponent,
          ),
      },
      {
        path: 'campaign/story/:id',
        loadComponent: () =>
          import('./chronicle/pages/story-chapter/story-chapter.component').then(
            (m) => m.StoryChapterComponent,
          ),
      },
      {
        path: 'maps',
        loadComponent: () =>
          import('./cartography/pages/maps-overview/maps-overview.component').then(
            (m) => m.MapsOverviewComponent,
          ),
      },
      {
        path: 'maps/:id',
        loadComponent: () =>
          import('./cartography/pages/map-detail/map-detail.component').then(
            (m) => m.MapDetailComponent,
          ),
      },
      {
        path: 'relationships/:sourceId/:targetId',
        loadComponent: () =>
          import('./guild/pages/relationship-detail/relationship-detail.component').then(
            (m) => m.RelationshipDetailComponent,
          ),
      },
      {
        path: 'gallery',
        loadComponent: () =>
          import('./guild/pages/gallery/gallery.component').then((m) => m.GalleryComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
