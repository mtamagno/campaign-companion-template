# Campaign content guide

Campaign data lives in `src/campaigns/`. The included
`example-campaign` is both a working demo and the canonical schema example.

## Directory layout

```text
src/campaigns/
├── campaigns.json
└── your-campaign-id/
    ├── data/
    │   ├── campaign.json
    │   ├── maps.json
    │   ├── party-relationships.json
    │   ├── npc-relationships.json
    │   ├── characters/
    │   │   ├── manifest.json
    │   │   └── character-id.json
    │   ├── npcs/
    │   │   ├── manifest.json
    │   │   └── npc-id.json
    │   └── sessions/
    │       ├── manifest.json
    │       └── session-id.json
    └── images/
```

Use lowercase URL-safe IDs. Every localized value has the shape
`{"en": "...", "it": "..."}`. If you only write one language, duplicate the
text so the language toggle never produces a blank field.

## Campaign manifest

`campaigns.json` is the homepage index. Each item needs `id`, localized
`name` and `description`, a `thumbnail` path from the site root and an
optional localized `status`.

The campaign folder name must exactly match its ID.

## Campaign and story

`data/campaign.json` controls the title, overview, game edition/system,
starting date, GM and party name. `heroImages` paths are relative to the
campaign root. `storySoFar` is a short cumulative recap.

Sessions are loaded in the order listed by
`data/sessions/manifest.json` and displayed by `sessionNumber`. The optional
`prose` field accepts simple HTML; use `<hr>` to split narrative sections.
Do not paste untrusted HTML.

## Characters

Each character JSON contains:

- public profile: backstory, traits, ideals, bonds, flaws and known history;
- private profile: secrets, motivations and GM notes;
- sheet: level, archetype/class, ancestry, background, abilities, saves,
  skills, equipment, features, spells and currency;
- optional `sheetHistory`: prior sheet snapshots for level progression;
- diary, session knowledge and quotes;
- image paths and a temporary spoiler password.

Use `"password": "cambiami"` only while setting up. Remember that a static
site cannot provide real server-side secrecy.

Spells are shown from names in the character sheet. This public repository does
not include a rulebook compendium or spell descriptions. If you extend the
empty catalog in `src/app/arcana/constants/spells.constants.ts`, add only
material whose license permits redistribution.

## NPCs, maps and relationships

NPCs support localized profile details, ally/enemy/neutral allegiance and an
optional category. Maps contain localized descriptions, image arrays,
discoveries and exploration status.

Relationship files contain directed edges between existing character/NPC IDs.
Supported types are defined in
`src/app/guild/models/relationship.model.ts`. Empty arrays are valid.

## Images

Keep original or properly licensed images under each campaign's `images/`
folder. PNG, JPEG and WebP files receive incremental display/thumbnail variants
during `npm run build`; SVG files are copied as-is. Write meaningful alt text.

Do not commit AI checkpoints, source scans or images whose license you cannot
verify. Keep a `CREDITS.md` beside third-party assets and record author,
source URL and license.

## Validate

```bash
npm ci
npm run build
```

Then browse every route, test both languages, export a PDF and verify direct
page reloads on your hosting provider.
