<p align="center">
  <img src="docs/images/questkeeper-wordmark.svg" alt="QuestKeeper — The self-hosted RPG Campaign Companion" width="860">
</p>

<p align="center"><strong>Roll initiative against scattered campaign notes.</strong></p>

<p align="center">
  <a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/"><strong>⚔️ LIVE COMPANION</strong></a>
  &nbsp;•&nbsp;
  <a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/manager-demo/"><strong>🗺️ MANAGER DEMO</strong></a>
  &nbsp;•&nbsp;
  <a href="#quick-start"><strong>🕯️ QUICK START</strong></a>
  &nbsp;•&nbsp;
  <a href="docs/CONTENT-GUIDE.md"><strong>📜 CONTENT GUIDE</strong></a>
</p>

<p align="center">
  <img alt="MIT licensed" src="https://img.shields.io/badge/license-MIT-c9a35b?style=flat-square">
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-486b63?style=flat-square">
  <img alt="Any campaign language" src="https://img.shields.io/badge/languages-any-805d93?style=flat-square">
  <img alt="GitHub Pages ready" src="https://img.shields.io/badge/deploy-GitHub%20Pages-333?style=flat-square&logo=github">
</p>

<p align="center">
  <img src="docs/images/campaign-companion-hero.webp" alt="A lantern-lit game master's table with dice, maps, a compass and an open campaign journal" width="100%">
</p>

QuestKeeper is a beautiful, self-hosted campaign manager for tabletop RPGs.
It turns characters, secret notes, NPCs, relationships, session chronicles,
locations and artwork into a responsive website your whole party can revisit
between games.

The included local Campaign Manager handles the files behind the screen. You
write through friendly forms; it handles JSON, folders, indexes, images,
validation and backups. No subscription. No account. No mimic hiding in the
installer.

> **System-friendly by design.** The optional sheet uses a familiar
> six-ability fantasy-RPG structure, while the campaign archive works for any
> tabletop system. No commercial rules, published adventures or third-party
> artwork are bundled.

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

## See the Companion in action

The published Companion is the party-facing archive: choose a chronicle, revisit
the campaign and open a character without digging through chat history. Click
any screenshot to enter the live sample.

<a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/">
  <img src="docs/images/companion-campaigns.jpg" alt="QuestKeeper campaign selector showing The Lantern Road sample campaign" width="100%">
</a>

<table>
  <tr>
    <td width="50%">
      <a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/example-campaign">
        <img src="docs/images/companion-overview.jpg" alt="The Lantern Road campaign overview in QuestKeeper" width="100%">
      </a>
    </td>
    <td width="50%">
      <a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/example-campaign/party/aria-vale">
        <img src="docs/images/companion-character.jpg" alt="Aria Vale public character profile in QuestKeeper" width="100%">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center"><em>Campaign overview</em></td>
    <td align="center"><em>Character profile</em></td>
  </tr>
</table>

<p align="center">
  <a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/"><strong>Enter the live Companion →</strong></a>
</p>

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

## Why your party will want it

<table>
  <tr>
    <td width="180" align="center"><img src="docs/images/quill-welcome.webp" alt="Quill the dragon archivist welcoming the reader with a map" width="165"></td>
    <td>
      <strong>One archive. Two sides of the screen.</strong><br><br>
      The Game Master gets searchable lore, NPCs, maps, spoilers and validation. Players get beautiful profiles, journals, relationships, galleries and a campaign history that does not vanish into last month's chat.
    </td>
  </tr>
</table>

| For the Game Master                                    | For the players                                        |
| ------------------------------------------------------ | ------------------------------------------------------ |
| One searchable home for lore, NPCs and session history | A beautiful place to revisit the adventure             |
| Public profiles plus spoiler-protected private notes   | Character journals and level-by-level progression      |
| Visual campaign editor with recoverable deletion       | Styled character-sheet PDF exports                     |
| Backups, build validation and original-image uploads   | Mobile-friendly maps, galleries and relationship views |
| Optional local Discord transcription                   | A remembered language and spoiler-warning choice       |

And yes, the site remembers when a visitor accepts the spoiler warning—because
defeating the same modal every session is not a heroic quest.

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

## The Campaign Manager

The manager is your local GM screen. It writes portable campaign files behind
the scenes while you work through a visual interface.

<p align="center">
  <a href="https://mtamagno.github.io/questkeeper-rpg-campaign-manager/manager-demo/"><strong>🗺️ Open the interactive Campaign Manager demo →</strong></a>
</p>

### 1 · Gather the party

Create a campaign, restore a backup or inspect the entire archive at a glance.

![Campaign Manager dashboard showing campaign totals and navigation](docs/images/campaign-manager-dashboard.webp)

### 2 · Write in every tongue

Choose any campaign languages with standard codes such as `en`, `es`, `de`,
`ja`, `pt-BR` or `fr-CA`. Translation fields appear automatically; visitors
choose their preferred language from the published site.

![Campaign editor showing language settings, table details and campaign fields](docs/images/campaign-manager-editor.webp)

### 3 · Chronicle the world

Add characters, NPCs, session recaps, locations and original artwork. IDs,
image placement and campaign indexes are kept in sync for you.

![Character archive with controls to add, edit and remove entries](docs/images/campaign-manager-content.webp)

### 4 · Scout ahead, then publish

Prepare dependencies, preview the real site and run a production check from
one guided screen. When the omens are favorable, GitHub Actions deploys it.

![Setup and publishing screen with preparation, preview and validation actions](docs/images/campaign-manager-publish.webp)

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

## Session notes: Discord bot or trusty notebook

<table>
  <tr>
    <td>
      <strong>If you play on Discord</strong>, the optional local Session Scribe can join voice, identify speakers by their Discord display name and write a timestamped Markdown transcript. Start and stop it directly from the Campaign Manager.<br><br>
      <strong>If you play around a table—or simply prefer writing</strong>, handwritten notes and any notes app work perfectly. After the game, add your summary and key events in the Sessions tab. The Companion never requires the bot.
    </td>
    <td width="190" align="center"><img src="docs/images/quill-notes.webp" alt="Quill the dragon archivist taking notes in a campaign journal" width="175"></td>
  </tr>
</table>

![Discord Session Scribe screen with bot status, launch controls and a handwritten-notes alternative](docs/images/campaign-manager-scribe.webp)

The Scribe processes speech locally with faster-whisper. Temporary audio stays
in memory, saved output remains on the machine running the bot, and the bot
does **not** keep an audio recording. Always obtain informed consent from every
participant and follow local law.

Read the [Discord Session Scribe setup guide](discord-transcriber/README.md).

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

## Quick start

<table>
  <tr>
    <td width="180" align="center"><img src="docs/images/quill-guide.webp" alt="Quill the dragon archivist holding a lantern and pointing onward" width="165"></td>
    <td>
      <ol>
        <li>Install <a href="https://nodejs.org/">Node.js 24</a>.</li>
        <li>Download this repository as a ZIP or clone it.</li>
        <li><strong>Windows:</strong> double-click <code>setup.bat</code>.</li>
        <li><strong>macOS:</strong> double-click <code>setup.command</code>.</li>
        <li><strong>Linux:</strong> run <code>./setup.sh</code>.</li>
      </ol>
      Your browser opens the local Campaign Manager. Create a campaign and begin the chronicle.
    </td>
  </tr>
</table>

The manager listens only on `127.0.0.1`, requires no account and stores your
campaign as ordinary files under `src/campaigns/`. Removed content goes to
`.campaign-manager/trash/` whenever possible, so a misplaced click is not a
permanent disintegration spell.

The included original demo, **The Lantern Road**, is safe to explore, copy or
delete. Its protected example character uses the temporary password
`cambiami`; change or remove it before publishing real notes. This is a
client-side spoiler curtain, not strong security.

For advanced editing, see the [campaign content guide](docs/CONTENT-GUIDE.md).

## Language support

Campaign content supports any language or regional language code configured by
the author. The selector displays native language names when supported by the
browser, remembers each visitor's choice and falls back to English—or the first
available translation—when a field is incomplete.

The built-in interface currently has polished English and Italian copy. Other
selected languages receive the English interface with fully localized campaign
content, keeping every archive usable while additional UI catalogs are added.

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

## Publish

### GitHub Pages

Push your copy to GitHub, open **Settings → Pages**, select **GitHub Actions**
and run the included **Deploy to GitHub Pages** workflow. The base path is
calculated automatically.

### Any static web server

```bash
npm ci
npm run build
```

Upload `dist/campaign-companion/browser/` to your web root and configure SPA
fallback to `index.html`. Apache and Nginx examples live in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Optional local AI helpers

`tools/local-ai/` can ask a local [Ollama](https://ollama.com/) model for an
original structured campaign draft and prepare prompts for a local
[ComfyUI](https://www.comfy.org/) installation. Nothing overwrites campaign
data automatically: the GM reviews every draft first.

See the [local AI guide](tools/local-ai/README.md). You are responsible for the
licenses of the models, inputs and generated output you use.

## Safety, secrets and dragons

- Never commit `.env`, bot tokens, passwords, API keys or private transcripts.
- Client-side protected notes ship to the browser; do not store genuine secrets.
- Publish only text and images you created or may legally redistribute.
- Do not add scanned books, copied rule text, published maps or adventure prose.
- This independent project is not affiliated with or endorsed by any tabletop publisher.

Code is released under the [MIT License](LICENSE). The sample campaign,
placeholders, hero artwork and Quill illustrations were created specifically
for this project and may be reused under the same license.

<p align="center">◆ ───────────── ✦ ───────────── ◆</p>

<p align="center"><em>May your recaps be accurate, your secrets stay hidden, and your scheduling checks roll high.</em></p>
