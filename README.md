# Campaign Companion

A self-hosted, bilingual campaign archive for tabletop role-playing groups. It
organizes characters, private character sheets, NPCs, relationships, session
recaps, locations, images and PDF exports in a static Angular application.

This public template contains one tiny **original** sample campaign, “The
Lantern Road”. Delete or copy it when you are ready to add your own material.
No commercial rulebook, published adventure, private campaign, credential or
third-party artwork is included.

> The project is system-friendly, but its optional sheet fields follow a
> familiar six-ability fantasy-RPG shape. Adapt the TypeScript models if your
> game uses different mechanics.

## What is included

- responsive campaign hub in English and Italian;
- spoiler warning remembered on the visitor's device;
- public and password-protected character information;
- level-by-level sheet history and styled PDF export;
- NPC, relationship, session, map and gallery views;
- local Discord voice transcription with per-user attribution;
- optional local-AI helpers for original campaign drafts and image prompts;
- automated GitHub Pages publishing.

## Run locally

Requirements: [Node.js 24](https://nodejs.org/) and npm.

```bash
git clone https://github.com/mtamagno/campaign-companion-template.git
cd campaign-companion-template
npm ci
npm start
```

Open `http://localhost:4200`. The protected example character uses the
temporary password `cambiami`. Change or remove it before publishing real
private notes; this is a client-side convenience lock, not strong security.

## Add your campaign

1. Copy `src/campaigns/example-campaign` to
   `src/campaigns/your-campaign-id`.
2. Add an entry to `src/campaigns/campaigns.json`.
3. Edit `data/campaign.json`.
4. Add characters, NPCs and sessions as separate JSON files and list each
   filename in its folder's `manifest.json`.
5. Update `maps.json`, `party-relationships.json` and
   `npc-relationships.json`.
6. Put your licensed/original images under the campaign's `images/` folder
   and use paths relative to the campaign root, such as
   `images/characters/aria.webp`.
7. Run `npm run build`; schema or template errors will surface during the
   build.

The full field guide and examples are in
[docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md). Spell descriptions and rulebook
compendia are intentionally absent. Add only data you wrote or are legally
allowed to redistribute.

## Publish

### GitHub Pages

Push your copy to GitHub, open **Settings → Pages**, select **GitHub Actions**,
then run the included “Deploy to GitHub Pages” workflow. It calculates the
repository base path automatically.

### Any static web server

```bash
npm ci
npm run build
```

Upload the contents of `dist/campaign-companion/browser/` to your web root.
For direct links to work, configure SPA fallback to `index.html`. Ready-to-use
Apache and Nginx examples are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Discord transcription

`discord-transcriber/` contains a local, opt-in transcription bot based on
faster-whisper. It does not upload voice to an AI provider: temporary audio
stays in memory and Markdown transcripts stay on the machine running the bot.

See [discord-transcriber/README.md](discord-transcriber/README.md) for Discord
permissions, CPU/GPU profiles, Windows launchers and transcript import. Always
obtain every participant's informed consent and follow local law.

## Local AI (optional)

The helpers in `tools/local-ai/` can ask a local
[Ollama](https://ollama.com/) model for a structured, original campaign draft
and turn that draft into prompts for a local
[ComfyUI](https://www.comfy.org/) installation. They never overwrite campaign
data automatically: review the draft before copying it into `src/campaigns`.

See [tools/local-ai/README.md](tools/local-ai/README.md). You are responsible
for the license of every model, input and generated output you use.

## Safety and licensing

- Never commit `.env`, bot tokens, hosting passwords, API keys or transcripts.
- Do not publish scans, copied rules text, adventure prose, maps or artwork
  unless their license explicitly permits redistribution.
- Change every example password. Client-side protected content is still shipped
  to the browser and is not suitable for high-value secrets.
- This independent project is not affiliated with or endorsed by any tabletop
  publisher.

Code is available under the [MIT License](LICENSE). Sample text and SVG
placeholders created specifically for this repository may be reused under the
same license. Third-party credits are documented beside the relevant assets.

## Italiano

Per partire: `npm ci`, poi `npm start`. Duplica
`src/campaigns/example-campaign`, rinomina l'ID, aggiorna
`campaigns.json` e sostituisci tutti i JSON e le immagini di esempio.
Le guide dettagliate coprono popolamento, server proprio, GitHub Pages,
trascrizione Discord e AI locale.
