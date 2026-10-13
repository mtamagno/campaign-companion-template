# SFX Credits

All sound effects in this folder are sourced from **Kenney.nl** asset packs and licensed under **Creative Commons CC0 1.0 Universal** (Public Domain Dedication).

Although CC0 does not require attribution, we credit the author here as a courtesy and to make license tracking easy.

## Author
**Kenney** — https://kenney.nl

## License
**CC0 1.0** — https://creativecommons.org/publicdomain/zero/1.0/

## File mapping

| Final file | Source pack | Original file | Purpose |
|------------|-------------|---------------|---------|
| `click-soft.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `click_003.ogg` | UI click feedback |
| `hover-shimmer.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `glass_001.ogg` | UI hover feedback |
| `success-chime.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_001.ogg` | Successful action confirmation |
| `error-thud.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `error_004.ogg` | Error feedback |
| `levelup-fanfare.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_002.ogg` | Milestone / level-up feedback (fallback — see note below) |
| `page-turn.ogg` | [RPG Audio](https://kenney.nl/assets/rpg-audio) | `bookFlip1.ogg` | Page navigation / chronicle prose |
| `dice-roll.ogg` | [Casino Audio](https://kenney.nl/assets/casino-audio) | `dice-throw-1.ogg` | Dice roll / loader |

## Notes
- The Casino Audio pack v1.1 (current at time of download) no longer ships true fanfare/chime sounds — only card/chip/dice foley. We mapped `levelup-fanfare` to a richer confirmation sound from Interface Sounds as a tasteful fallback. If a more triumphant fanfare is desired, replace this single file with one from Kenney's [UI Audio](https://kenney.nl/assets/ui-audio) or [Music Jingles](https://kenney.nl/assets/music-jingles) pack — keep the filename identical to avoid touching the constants module.
- All files are mono OGG Vorbis, sourced as-is from Kenney (no re-encoding performed).
