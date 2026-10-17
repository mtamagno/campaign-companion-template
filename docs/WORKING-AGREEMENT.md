# QuestKeeper Working Agreement

This is the shared operating system for product, engineering and release work.
It turns the roadmaps into repeatable decisions and keeps fast, AI-assisted
development from trading away trust or maintainability.

## 1. Product north star

Every change should help a player or Game Master do at least one of these:

- understand the campaign faster;
- preserve a meaningful table memory;
- prepare or run a session with less friction;
- contribute without learning repository internals;
- retain control of private, portable campaign data.

When two solutions are equally capable, choose the one with fewer concepts,
fewer clicks and a clearer recovery path. Fantasy atmosphere may enrich an
action, but must never obscure it.

## 2. Planning hierarchy

| Horizon    | Source                                     | Purpose                                 |
| ---------- | ------------------------------------------ | --------------------------------------- |
| One year   | [`ROADMAP.md`](../ROADMAP.md)              | Outcomes players and GMs can expect     |
| Sixty days | [`ROADMAP-60-DAYS.md`](ROADMAP-60-DAYS.md) | Delivery sequence and two daily commits |
| One week   | Weekly review                              | Seven-day commitment and risks          |
| One change | Issue or pull request                      | Acceptance criteria and proof           |

The roadmap is a direction, not a promise to preserve an outdated order. A
weekly review may reorder future work when user evidence, risk or dependency
changes justify it. Never silently rewrite completed history.

## 3. Weekly operating rhythm

### Monday: choose the week's outcome

1. Copy [`templates/WEEKLY-REVIEW.md`](templates/WEEKLY-REVIEW.md) into a new
   dated issue or project note.
2. Review the live Companion, open feedback, failed workflows and unfinished
   work from the previous week.
3. Select one player-facing weekly outcome and up to fourteen candidate atomic
   commits from the 60-day plan.
4. Mark dependencies, risky migrations and work needing visual review.
5. Confirm each item satisfies the Definition of Ready below.

### During the week: deliver in small chapters

- Aim for two useful, independently understandable commits per working day.
- Commit one concern at a time; do not split a single broken change merely to
  reach a number.
- Keep the branch releasable. Run focused tests while working and
  `npm run verify` before a pull request or push to `main`.
- Record discoveries that change scope in the weekly note.
- Preview visual work at desktop and 360 px mobile widths before review.

### Friday or Sunday: review and re-plan

1. Walk through the week's outcome as a new player and as a GM.
2. Compare planned versus shipped outcomes, not raw commit count.
3. Check CI, accessibility, mobile layout, demo paths and known regressions.
4. Capture user feedback, decisions, metrics and unfinished work.
5. Update the 60-day plan checkboxes and only change the annual roadmap when a
   user-visible checkpoint has materially changed.
6. Carry work forward deliberately, reduce it, or remove it; never let it
   remain ambiguous.

## 4. Definition of Ready

A change is ready to begin when:

- the user and problem are identifiable;
- the desired outcome can be demonstrated;
- scope and explicit non-goals are clear;
- affected data, privacy, accessibility and copyright risks are known;
- required references or licensed assets are available;
- acceptance checks fit in a short list.

Exploration may start earlier, but it is not a delivery commitment yet.

## 5. Definition of Done

A change is done only when all relevant statements are true:

- the complete user journey works, including empty and error states;
- campaign data remains backward compatible or has a documented migration;
- keyboard, focus, contrast and meaningful alternative text were checked;
- desktop and small-screen layouts were visually reviewed;
- new behavior has automated coverage at the lowest useful level;
- `npm run verify` succeeds from a clean installation;
- user-facing copy and documentation match the implementation;
- no credential, private transcript, copyrighted material or generated junk was
  added;
- a visual change includes before/after or final screenshots in its pull request;
- the commit and pull request explain user impact, not merely filenames.

## 6. Code structure and ownership

Keep domain boundaries recognizable:

| Area                      | Responsibility                                                 |
| ------------------------- | -------------------------------------------------------------- |
| `src/app/`                | Companion interface, routing and reusable application behavior |
| `src/campaigns/`          | Campaign-owned data and licensed/original media                |
| `src/styles/`             | Shared tokens, typography, layout foundations and themes       |
| `tools/campaign-manager/` | Local authoring application and file operations                |
| `discord-transcriber/`    | Optional consent-based Session Scribe                          |
| `scripts/`                | Deterministic build and media processing tasks                 |
| `docs/`                   | Public guidance, decisions and operational templates           |

### Architecture rules

- Keep campaign content out of Angular component source.
- Parse and validate external data at its boundary; use typed domain models
  internally.
- Prefer small components with one clear responsibility and explicit inputs.
- Put reusable behavior in a service or pure helper, not copied event handlers.
- Keep file-system mutations inside the Campaign Manager server boundary.
- Preserve strict TypeScript and Angular template checking. Do not use `any` to
  avoid modeling a value; use `unknown` and narrow it.
- Avoid hidden global state. Make persistence, locale and campaign selection
  explicit.
- Keep generated derivatives reproducible; source images remain the authority.
- Do not mix opportunistic refactors with a user-facing fix unless the refactor
  is required for safety.

### Campaign data changes

Schema or template changes must include the validator, example campaign,
manager form, documentation and backward-compatibility behavior in the same
delivery. A clear validation error is better than silently discarding data.

## 7. Quality gates

The repository exposes one complete local gate:

```bash
npm run verify
```

It runs ESLint, Prettier verification, strict type checking, Campaign Manager
tests, Session Scribe tests and the production build. CI runs the same classes
of checks on supported platforms. A contributor may run focused commands while
iterating, but must not bypass a failing full gate to merge.

### What to test

- **Pure logic:** unit tests for transformations, validation and calculations.
- **Manager operations:** integration tests for create, edit, import, backup,
  restore and safe file handling.
- **Companion journeys:** route-level tests for campaign selection, character
  access, sessions and empty/error states as the harness expands.
- **Visual behavior:** manual responsive review plus screenshots until automated
  visual regression coverage lands.
- **Content:** production build validation for manifests, references and schema.

A bug fix should first reproduce the failure in a test whenever practical.
Tests must be deterministic, independent of network access and free of personal
campaign data.

## 8. Linting and formatting

- ESLint is the semantic source of truth for TypeScript and Angular templates.
- Prettier owns formatting; do not hand-align code against it.
- Shared visual constants belong in `src/styles/_variables.scss` rather than
  being repeatedly hardcoded in components.
- New lint suppression needs a nearby explanation and the narrowest possible
  scope. Disabling a rule for an entire project requires a documented decision.
- Generated output and binary assets are excluded; their source and generator
  are reviewed instead.

Use `npm run format` before the final verification when files need formatting.

## 9. Commits, branches and pull requests

Use short branches such as `feat/session-search` or `fix/mobile-profile-art`.
Write Conventional Commit subjects in imperative English:

```text
feat: add a player-facing session search
fix: preserve portrait focus on narrow screens
docs: clarify Session Scribe consent
test: cover campaign import recovery
refactor: isolate campaign manifest parsing
chore: refresh development tooling
```

An atomic commit should compile, explain one coherent decision and be safe to
revert. Generated files belong with the source change that produced them.

Every pull request must state:

- the user problem and visible result;
- scope and non-goals;
- how it was verified;
- accessibility, privacy and content-license impact;
- screenshots for visual changes;
- migration or rollback notes when data can change.

Review the behavior first, then data safety, accessibility, tests, architecture
and style. Prefer concrete examples over taste-based comments.

## 10. Releases and deployment

- `main` must remain deployable.
- The Pages workflow must pass quality checks before publishing.
- User-visible additions and fixes belong in release notes or the relevant
  roadmap checkpoint.
- Follow semantic versioning: patch for compatible fixes, minor for compatible
  capabilities, major for intentional breaking changes.
- Data migrations need a backup path and a recovery note before release.

## 11. Privacy, security and legal safety

Follow [`SECURITY.md`](../SECURITY.md) and these additional rules:

- local-first means no new network transfer without explicit user action;
- voice transcription requires informed consent from every participant;
- never store an audio recording by default;
- redact tokens and private campaign data from issues, screenshots and logs;
- client-side protected notes prevent casual spoilers only;
- use only original, licensed or clearly redistributable prose and artwork.

## 12. AI-assisted work

AI may accelerate drafts, tests, documentation and original art, but it does
not replace review. The contributor remains responsible for correctness,
licenses, privacy, consistency and accessibility.

- Never place secrets, private transcripts or unpublished personal campaigns in
  a remote model without informed authorization.
- Review every generated line and asset in its final context.
- Do not imitate a living artist or reproduce a protected franchise style.
- Keep prompts and references generic, original and traceable when they affect
  reusable project assets.
- Generated campaign prose must not invent player choices and generated recaps
  must distinguish table facts from interpretation.

## 13. Decisions and exceptions

An exception is acceptable when it produces a safer or clearer outcome than
the default rule. Record the reason, affected scope, owner and removal condition
in the pull request or weekly review. Repeated exceptions signal that this
agreement should be revised during the next weekly review.
