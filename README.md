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

## Quick start: no JSON required

Install [Node.js 24](https://nodejs.org/), then download this repository as a
ZIP (or clone it). Open the extracted folder and launch:

- **Windows:** double-click `setup.bat`;
- **macOS:** double-click `setup.command` (the first time, Control-click it and
  choose **Open** if macOS asks for confirmation);
- **Linux:** run `./setup.sh`.

The local Campaign Manager opens in your browser. From there you can:

- create, edit, back up and remove campaigns;
- add characters, NPCs, session recaps, locations and original images;
- prepare dependencies, validate the data and launch the Companion;
- see immediately what is already present in each campaign.

The manager only listens on your computer (`127.0.0.1`), requires no account
and writes the correct files and manifests for you. Removed content is moved
to `.campaign-manager/trash/` so accidental deletions are recoverable.

See the [Campaign Manager guide](tools/campaign-manager/README.md) for backup,
troubleshooting and command-line alternatives. The protected example
character uses the temporary password `cambiami`: change or remove it before
publishing real private notes. This is a client-side convenience lock, not
strong security.

### Advanced: manual editing

The data remains plain JSON, so experienced users can still edit it directly.
The complete schema, folder layout and examples are documented in
[docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md). Run `npm run build` after manual
changes. Spell descriptions and rulebook compendia are intentionally absent;
add only material you wrote or are legally allowed to redistribute.

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

Installa Node.js 24, scarica e decomprimi il progetto, poi fai doppio clic su
`setup.bat` in Windows oppure su `setup.command` in macOS. Su Linux esegui
`./setup.sh`. Si aprirà un pannello locale dal quale puoi creare e gestire
campagne, personaggi, PNG, sessioni, luoghi e immagini senza modificare JSON o
manifest a mano. Dal pannello puoi anche preparare il progetto, controllarlo e
aprire l'anteprima del sito. La [guida del Campaign
Manager](tools/campaign-manager/README.md) spiega backup e risoluzione dei
problemi; le altre guide coprono GitHub Pages, trascrizione Discord e AI locale.
