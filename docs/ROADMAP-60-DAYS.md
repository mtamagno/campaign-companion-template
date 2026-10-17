# QuestKeeper — 60-Day AI-Accelerated Plan

**Period:** 18 October–16 December 2026  
**Target:** QuestKeeper 1.5 · Game Night Edition  
**Cadence:** two meaningful, buildable commits per day — 120 commits total.

This plan assumes AI-assisted implementation, testing, writing and asset
preparation. The increased speed is used to ship broader player-facing slices,
not to remove review or quality checks. Every commit must keep the build usable,
include the tests appropriate to its risk and avoid private or copyrighted
campaign content.

## Week 1 — A compelling first experience

| Day         | Commit 1                                                       | Commit 2                                                             |
| ----------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| 01 · 18 Oct | [ ] `docs: define the Game Night Edition product goals`        | [ ] `docs: publish player and GM acceptance journeys`                |
| 02 · 19 Oct | [ ] `style: ship unified fantasy design tokens and components` | [ ] `style: add heroic gothic and neutral campaign palettes`         |
| 03 · 20 Oct | [ ] `feat: add separate first-visit paths for players and GMs` | [ ] `feat: add a guided live-demo tour with remembered progress`     |
| 04 · 21 Oct | [ ] `feat: make the Companion installable as a PWA`            | [ ] `feat: cache recent characters and recaps for offline reading`   |
| 05 · 22 Oct | [ ] `feat: introduce global command palette navigation`        | [ ] `feat: add recent pages favourites and continue-reading actions` |
| 06 · 23 Oct | [ ] `a11y: complete keyboard focus and landmark overhaul`      | [ ] `perf: enforce image font and initial-load budgets`              |
| 07 · 24 Oct | [ ] `feat: publish a richer Lantern Road player journey`       | [ ] `release: ship QuestKeeper 1.4 foundation release`               |

## Week 2 — Characters that grow with the story

| Day         | Commit 1                                                           | Commit 2                                                                |
| ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 08 · 25 Oct | [ ] `feat: redesign profiles around identity bonds and memories`   | [ ] `feat: add quick facts signature items and favourite moments`       |
| 09 · 26 Oct | [ ] `feat: add instant return-to-my-character flow`                | [ ] `feat: remember private-sheet and journal reading position`         |
| 10 · 27 Oct | [ ] `feat: build side-by-side level history comparison`            | [ ] `feat: highlight gained spells abilities gear and stat changes`     |
| 11 · 28 Oct | [ ] `feat: add searchable spell and ability library per character` | [ ] `feat: add prepared favourites usage notes and external references` |
| 12 · 29 Oct | [ ] `feat: redesign combat resources currency and inventory`       | [ ] `feat: add signature equipment and attunement storytelling`         |
| 13 · 30 Oct | [ ] `feat: add public and protected personal journals`             | [ ] `feat: connect journal entries to sessions people and places`       |
| 14 · 31 Oct | [ ] `feat: generate complete fantasy character dossiers`           | [ ] `feat: add print share and compact game-night PDF variants`         |

## Week 3 — The party remembers together

| Day         | Commit 1                                                      | Commit 2                                                               |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 15 · 01 Nov | [ ] `feat: redesign party bonds as a living relationship map` | [ ] `feat: add trust tension affection and promise histories`          |
| 16 · 02 Nov | [ ] `feat: add character-to-character shared memory pages`    | [ ] `feat: surface conflicting versions of the same event`             |
| 17 · 03 Nov | [ ] `feat: introduce favourite campaign memories`             | [ ] `feat: build a party-wide memory gallery and filters`              |
| 18 · 04 Nov | [ ] `feat: create notebook table of contents and chronology`  | [ ] `feat: add mood session character and secrecy filters`             |
| 19 · 05 Nov | [ ] `feat: add letters sketches handouts and keepsakes`       | [ ] `feat: create accessible lightbox and print layouts for keepsakes` |
| 20 · 06 Nov | [ ] `style: ship multiple parchment and handwriting moods`    | [ ] `feat: adapt journal styling to narrator and emotional state`      |
| 21 · 07 Nov | [ ] `feat: add character epilogues and legacy pages`          | [ ] `release: ship QuestKeeper 1.4.1 character stories`                |

## Week 4 — Game Night command centre

| Day         | Commit 1                                                             | Commit 2                                                                   |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 22 · 08 Nov | [ ] `feat: build game-night dashboard with party and location state` | [ ] `feat: add open threads pinned clues promises and quests`              |
| 23 · 09 Nov | [ ] `feat: add five-minute campaign catch-up mode`                   | [ ] `feat: add previously-on presentation view for the table`              |
| 24 · 10 Nov | [ ] `feat: deliver campaign-wide full-text search`                   | [ ] `feat: group results across sessions characters NPCs places and clues` |
| 25 · 11 Nov | [ ] `feat: add campaign timeline with arcs and turning points`       | [ ] `feat: connect timeline events to every related page`                  |
| 26 · 12 Nov | [ ] `feat: introduce bookmarks and personal reading lists`           | [ ] `feat: add history-aware continue-reading recommendations`             |
| 27 · 13 Nov | [ ] `feat: create printable game-night packet`                       | [ ] `feat: add compact mobile table mode with wake-lock guidance`          |
| 28 · 14 Nov | [ ] `feat: add campaign ending and epilogue experience`              | [ ] `release: ship QuestKeeper 1.4.2 game-night preview`                   |

## Week 5 — A connected living world

| Day         | Commit 1                                                            | Commit 2                                                             |
| ----------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 29 · 15 Nov | [ ] `feat: expand NPC dossiers with encounters motives and changes` | [ ] `feat: add public knowledge versus GM truth presentation`        |
| 30 · 16 Nov | [ ] `feat: create interactive NPC relationship histories`           | [ ] `feat: connect NPC opinions to sessions and player choices`      |
| 31 · 17 Nov | [ ] `feat: add annotated maps with discovered markers`              | [ ] `feat: connect map markers to sessions NPCs clues and galleries` |
| 32 · 18 Nov | [ ] `feat: build clue board for evidence suspects and questions`    | [ ] `feat: add spoiler-aware connections and theory tracking`        |
| 33 · 19 Nov | [ ] `feat: add quest promise and obligation tracker`                | [ ] `feat: show consequences and ownership without task-app clutter` |
| 34 · 20 Nov | [ ] `feat: add story arcs chapter collections and completion state` | [ ] `feat: generate arc-level recaps and cast lists`                 |
| 35 · 21 Nov | [ ] `feat: create world explorer linking every content type`        | [ ] `release: ship QuestKeeper 1.4.3 living-world preview`           |

## Week 6 — The Game Master's creative studio

| Day         | Commit 1                                                        | Commit 2                                                                |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 36 · 22 Nov | [ ] `feat: rebuild onboarding as campaign creation journey`     | [ ] `feat: provide original campaign starters and guided examples`      |
| 37 · 23 Nov | [ ] `feat: add campaign health dashboard and repair actions`    | [ ] `feat: explain missing translations images links and required data` |
| 38 · 24 Nov | [ ] `feat: add live preview to character and NPC editors`       | [ ] `feat: add duplicate rename archive and bulk-update workflows`      |
| 39 · 25 Nov | [ ] `feat: create visual session and story-arc editor`          | [ ] `feat: add reusable mystery journey social and battle structures`   |
| 40 · 26 Nov | [ ] `feat: build media library for portraits maps and handouts` | [ ] `feat: add crop focal-point replacement and usage tracking`         |
| 41 · 27 Nov | [ ] `feat: add visual theme studio with instant preview`        | [ ] `feat: guard readability with automatic contrast suggestions`       |
| 42 · 28 Nov | [ ] `feat: add complete campaign import export and cloning`     | [ ] `feat: add preview-before-import and conflict resolution`           |

## Week 7 — Session Scribe and local creative AI

| Day         | Commit 1                                                       | Commit 2                                                                     |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 43 · 29 Nov | [ ] `feat: ship guided Discord Scribe setup and consent flow`  | [ ] `feat: add reliable launch status diagnostics and recovery`              |
| 44 · 30 Nov | [ ] `feat: improve speaker identity and party-name mapping`    | [ ] `fix: filter silence repetition and common transcription hallucinations` |
| 45 · 01 Dec | [ ] `feat: build transcript review desk with fast corrections` | [ ] `feat: add speaker merge search highlights and chapter markers`          |
| 46 · 02 Dec | [ ] `feat: suggest key moments quotes NPCs places and clues`   | [ ] `feat: show transcript evidence behind every suggestion`                 |
| 47 · 03 Dec | [ ] `feat: draft quick full and GM-only recap variants`        | [ ] `feat: preserve narrator voice with reviewable tone profiles`            |
| 48 · 04 Dec | [ ] `feat: import typed notes and photos of handwritten pages` | [ ] `feat: merge multiple note sources into one review queue`                |
| 49 · 05 Dec | [ ] `feat: convert approved notes into linked session content` | [ ] `feat: require explicit GM review before publication`                    |

## Week 8 — Collaboration, languages and longevity

| Day         | Commit 1                                                          | Commit 2                                                             |
| ----------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| 50 · 06 Dec | [ ] `feat: add portable player contribution packages`             | [ ] `feat: build GM review inbox for journals memories and updates`  |
| 51 · 07 Dec | [ ] `feat: separate interface and campaign translation workflows` | [ ] `feat: add completeness reports and translation review packages` |
| 52 · 08 Dec | [ ] `feat: support custom system terminology and character facts` | [ ] `feat: add right-to-left foundations and broader script testing` |
| 53 · 09 Dec | [ ] `feat: add automatic versioned campaign backups`              | [ ] `feat: create visual preview-before-restore workflow`            |
| 54 · 10 Dec | [ ] `feat: add guided migrations for older campaign formats`      | [ ] `feat: validate complete transfer between machines and hosts`    |
| 55 · 11 Dec | [ ] `feat: add local campaign consistency assistant`              | [ ] `feat: flag conflicting names dates heights and known facts`     |
| 56 · 12 Dec | [ ] `feat: add original template and theme sharing format`        | [ ] `docs: publish creator legal accessibility and privacy guides`   |

## Final four days — QuestKeeper 1.5 launch

| Day         | Commit 1                                                           | Commit 2                                                             |
| ----------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 57 · 13 Dec | [ ] `feat: rebuild Lantern Road as complete 1.5 showcase`          | [ ] `docs: capture new player GM Scribe and mobile demo journeys`    |
| 58 · 14 Dec | [ ] `test: run full player GM recovery and accessibility journeys` | [ ] `perf: complete mobile offline gallery and large-campaign audit` |
| 59 · 15 Dec | [ ] `fix: resolve release-candidate feedback and regressions`      | [ ] `docs: publish migration guide changelog and launch story`       |
| 60 · 16 Dec | [ ] `release: publish QuestKeeper 1.5 Game Night Edition`          | [ ] `docs: open the 2027 public feedback and roadmap cycle`          |

## Parallel AI-accelerated tracks

These run throughout the sixty days and do not replace the two daily commits:

- generate test fixtures and edge cases for every new content flow;
- maintain English and Italian interface copy together;
- audit visual consistency and accessibility after each design change;
- prepare original demo content, image briefs and alt text;
- keep schemas, examples and documentation synchronized;
- summarize feedback into reviewable proposals rather than automatic changes.

## Daily working agreement

- Each commit must deliver a coherent capability, not a partial broken layer.
- Tests and documentation travel with the feature whenever practical.
- The second daily commit should usually deepen the first, not merely rename it.
- Build and focused tests run before every push.
- The second push of the day is verified on GitHub Pages in Chrome and mobile view.
- A working release candidate is tagged at the end of every week.
- Public examples use only original or legally redistributable material.
- Private campaign data, tokens, transcripts and passwords never enter this repository.

## Definition of done for QuestKeeper 1.5

- Players can resume a campaign, find their character and understand active
  threads in under five minutes.
- Character profiles preserve progression, relationships, journals, memories
  and printable sheets.
- Sessions connect naturally to people, places, clues, quests and story arcs.
- The Campaign Manager supports creation, previews, media and recovery without
  manual data-file editing.
- Discord, typed and handwritten notes can become reviewable session drafts.
- Local AI suggestions show their sources and never publish automatically.
- Campaigns remain portable, backed up, multilingual and usable on mobile.
- The public demo shows the complete experience before installation.
