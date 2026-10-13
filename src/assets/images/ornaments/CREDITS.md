# Ornament SVG Assets — Credits

All SVG files in this folder are **hand-authored** for this project.
No third-party assets were used.

| File | Description | License |
|------|-------------|---------|
| `divider-flourish.svg` | Symmetric line + diamond + line flourish for ornate dividers. Uses `currentColor` so consumers can theme via SCSS `color`. | Public domain (CC0) |
| `dice-d20.svg` | Stylized icosahedron silhouette with central "20" label. Uses `currentColor`. | Public domain (CC0) |

## Usage

These SVGs use `currentColor` for stroke and text fill. To recolor:

```scss
.my-element {
  color: $color-gold; // drives the SVG stroke
}
```

Avoid hardcoding colors inside the SVG files — keep them theme-agnostic.
