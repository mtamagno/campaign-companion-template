# Contributing to QuestKeeper

Thank you for helping parties remember the stories they create together.
Contributions are welcome when they keep QuestKeeper approachable, reusable,
private by default and legally redistributable.

## Start here

1. Read the [working agreement](docs/WORKING-AGREEMENT.md).
2. For interface or illustration work, also read the
   [design and art guide](docs/DESIGN-AND-ART-GUIDE.md).
3. Create a focused branch, run `npm ci`, then install the lightweight Session
   Scribe test dependencies with
   `python -m pip install -r discord-transcriber/requirements-test.txt`.
4. Make the smallest complete change that creates a visible user benefit.
5. Run `npm run verify` before opening a pull request.
6. Use the pull request template and include screenshots for visual changes.

The [60-day delivery plan](docs/ROADMAP-60-DAYS.md) describes the current
execution order. The [public roadmap](ROADMAP.md) describes the longer-term
player and Game Master experience. Plans guide the work; evidence and user
feedback may change their order during the weekly review.

## Essential commands

| Command                    | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `npm run manage`           | Open the local Campaign Manager                     |
| `npm start`                | Run the Companion locally                           |
| `npm run lint`             | Check TypeScript and Angular templates with ESLint  |
| `npm run format`           | Apply the shared Prettier rules                     |
| `npm run typecheck`        | Run strict TypeScript checks without emitting files |
| `npm run test:manager`     | Test Campaign Manager behavior                      |
| `npm run test:transcriber` | Test Session Scribe helpers                         |
| `npm run build`            | Validate campaign data and produce the site         |
| `npm run verify`           | Run every required local quality gate               |

## Non-negotiable boundaries

- Never commit credentials, private transcripts, personal data or real secrets.
- Keep campaign examples fictional, original and safe to redistribute.
- Do not submit publisher prose, copied rule text, scans, maps or unlicensed art.
- Treat client-side password protection as a spoiler curtain, not encryption.
- Preserve keyboard access, readable contrast and mobile usability.
- A generated asset still requires human review, provenance and license checks.

By contributing, you confirm that you have the right to license your
contribution under this repository's [MIT License](LICENSE).
