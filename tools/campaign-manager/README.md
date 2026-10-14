# Campaign Manager

Campaign Manager is the visual, local setup tool included with Campaign
Companion. It lets a group build and maintain its archive without copying
folders or editing JSON manifests.

## Open it

First install [Node.js 24](https://nodejs.org/). No global packages, database
or online account are required.

- Windows: double-click `setup.bat` in the project folder.
- macOS: double-click `setup.command`. On first launch, Control-click the file,
  choose **Open**, then confirm. If needed, run `chmod +x setup.command` once.
- Linux: run `chmod +x setup.sh && ./setup.sh`.
- Any platform: run `npm run manage` from a terminal.

The manager opens at `http://127.0.0.1:4173`. Keep its terminal window open;
closing that window stops the manager. If port 4173 is already occupied, it
automatically tries the next available port up to 4183.

## Typical workflow

1. Select **+** or **Create your first campaign** and fill in the campaign
   details. The ID becomes part of the URL, so use lowercase letters, numbers
   and hyphens.
2. Open the Characters, NPCs, Sessions or Locations tab and add entries with
   the forms. Uploaded PNG, JPEG and WebP images are copied into the correct
   campaign folder automatically.
3. Open **Startup and publishing** and choose **Prepare automatically** on the
   first run. This installs the project's locked dependencies.
4. Choose **Validate and build the site**. Fix any problem shown in the log.
5. Choose **Start the site**, then **Open now** to view the real Companion at
   `http://127.0.0.1:4200`.

All edits are ordinary files under `src/campaigns/`, so they remain portable
and versionable. The manager itself works before project dependencies are
installed because it uses only Node.js built-ins.

## Backups and deletion

The **Backup** button downloads campaign text and structured data as a JSON
bundle. Images are deliberately not embedded because they can make backups
very large: copy the campaign's `images/` folder separately. Use **Import
backup** in the sidebar to restore a bundle whose ID is not already present.

Deleting a character, NPC, session or campaign requires confirmation. Files
are moved to `.campaign-manager/trash/` whenever possible instead of being
permanently erased. Locations stored in the shared `maps.json` file are removed
from that file and remain recoverable through Git history or a backup.

## Publish on GitHub Pages

The panel prepares and validates the project locally. To publish, push the
changed files to your GitHub repository and enable **Settings → Pages → GitHub
Actions**. The included workflow builds and deploys the static site. See the
main [README](../../README.md#publish) for details.

## Troubleshooting

- **The window closes immediately:** open PowerShell or Terminal in the project
  folder and run `npm run manage` to see the error message.
- **`node` is not recognized:** install Node.js 24, then reopen the terminal or
  restart Windows.
- **The Companion does not open:** use **Prepare automatically** once, then
  start it again. Only one preview can use port 4200 at a time.
- **A build reports invalid data:** open the affected entry in the manager or
  consult the [content guide](../../docs/CONTENT-GUIDE.md) for advanced fields.

Campaign Manager binds only to localhost and uses a per-run token for changes.
It is an editing convenience, not an authentication system: do not expose its
port to the Internet.
