# QuestKeeper Design and Art Guide

QuestKeeper should feel like a treasured campaign journal: atmospheric enough
to invite exploration, calm enough to read during play and consistent enough
that every campaign still feels part of one product.

## Experience principles

1. **The story is the hero.** Decoration frames content; it never competes with
   names, actions, notes or navigation.
2. **Readable at the table.** Critical information must survive dim rooms,
   phones, tired eyes and a hurried rules lookup.
3. **One world, many campaigns.** Shared structure remains familiar while a
   restrained campaign accent provides identity.
4. **Progressive disclosure.** Show the next useful choice first. Advanced
   controls, spoilers and dense lore appear when requested.
5. **Recovery builds confidence.** Destructive actions explain consequences,
   confirm scope and offer recovery whenever possible.

## Interface system

### Color and contrast

- Use the semantic tokens in `src/styles/_variables.scss`.
- Gold is an accent, not body text or a universal outline.
- Campaign colors may tint highlights and atmosphere, but not redefine status
  meaning or reduce readability.
- Body text and controls target WCAG AA contrast. Never place pale text on a
  light image without a sufficiently opaque surface, gradient or shadow.
- Never communicate status using color alone; add text, an icon or shape.

### Typography

- Cinzel is reserved for short display headings and key labels.
- Crimson Text carries prose and campaign narrative.
- Controls, metadata and dense tables prioritize clarity over ornament.
- Keep prose lines roughly 55–75 characters wide and use relaxed line height.
- Avoid long all-caps strings. They slow reading and feel like decoration.

### Space, shape and motion

- Use the shared 4 px spacing scale and established radii/shadows.
- Group by proximity before adding another border or panel.
- Maintain one obvious primary action per view.
- Animation should explain state or place, complete quickly and respect
  `prefers-reduced-motion`.
- Loading, empty, error and success states receive the same care as the ideal
  populated view.

### Responsive behavior

- Design mobile-first and verify at 360 px, a medium tablet width and desktop.
- No essential action may depend on hover.
- Tap targets should be at least 44 by 44 CSS pixels where practical.
- Do not introduce horizontal page scrolling.
- Preserve the focal point of cover art; faces and important silhouettes may
  not be cropped by a generic `object-fit: cover` rule.

### Accessibility

- Use semantic HTML before ARIA.
- Every interactive element must work with a keyboard and show focus.
- Use meaningful alternative text for informative images and empty alt text for
  decoration.
- Heading levels describe the document, not desired font size.
- Forms need visible labels, useful instructions and errors tied to fields.
- Spoiler and password dialogs return focus sensibly when closed.

## Page composition

The preferred reading order is:

1. identity and location;
2. immediate purpose or next action;
3. core information;
4. supporting lore and relationships;
5. secondary metadata and tools.

Character pages use a square facial close-up beside a portrait where both are
available. The close-up is not a token and should not contain a token ring.
Character, NPC, session and location pages should share recognizable rhythm,
while their content determines the emphasis.

## Illustration direction

### Shared rules

- Keep anatomy, height relationships, equipment, markings and facial features
  faithful to the approved reference sheets.
- A group image uses one coherent rendering method, palette, light source and
  level of detail. Characters must look present in the same scene.
- Use clear silhouettes, intentional staging and enough proximity to feel like
  a party rather than separate portraits.
- Prefer controlled values and clean edges. Texture may create atmosphere but
  must not make faces, hands or equipment muddy.
- Standard campaign illustrations follow the emotional mood of the depicted
  session or event, not a permanent one-size-fits-all darkness.
- Do not add jewelry, weapons, scars or costume details absent from the approved
  design merely to make an image busier.

### Asset roles

| Asset              | Composition                            | Use                        |
| ------------------ | -------------------------------------- | -------------------------- |
| Campaign cover     | Landscape, protected focal area        | Campaign selector and hero |
| Character face     | Square close-up, neutral edge room     | Profile identity           |
| Character portrait | Full or three-quarter body             | Appearance and reference   |
| Token              | Readable bust inside a deliberate ring | Virtual tabletop play      |
| Session image      | Landscape narrative moment             | Chronicle chapter          |
| Notebook page      | Paper page or spread                   | In-character memory        |

Keep important cover content inside a central safe zone so responsive cropping
does not remove heads or identifying details. Export a purpose-built crop when
one image cannot safely serve multiple roles.

### Personal journals and notebooks

A character-owned notebook is an artifact written by that character, not an
objective recap.

- Its drawing style, pressure, neatness and density follow the author's current
  emotional mood.
- Every illustrated entry includes the character's thoughts, doubts or private
  observations as legible handwritten text.
- Facts remain compatible with the session record, but interpretation may be
  incomplete or biased.
- Visual evolution across pages should feel gradual and narratively motivated.
- Handwriting remains readable; distress is expressed through composition and
  mark-making, not illegibility.

### Prompt and review checklist

Before generating or accepting an illustration, record:

- asset role and exact aspect ratio;
- event, location and emotional mood;
- present characters and canonical height order;
- immutable reference details and forbidden additions;
- camera, staging, medium, palette and light source;
- safe areas for text and responsive crops;
- desired file format, dimensions and alt-text intent.

Review the result for likeness, anatomy, hands, proportions, equipment,
continuity, unwanted text, accidental logos, crop safety and tonal consistency.
A beautiful image that contradicts the campaign reference is not finished.

## Visual change review

Every visual pull request includes desktop and mobile evidence. Review in this
order:

1. Can a new player understand the page and next action?
2. Is all text readable against every background?
3. Are focus, keyboard behavior and touch targets sound?
4. Does the layout survive short, long and missing content?
5. Does the art preserve approved character and campaign continuity?
6. Does the change reuse tokens and patterns rather than add a one-off system?

When an intentional exception becomes common, promote it into a documented
token or component during the weekly review.
