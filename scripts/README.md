# Build utilities

- `generate-thumbnails.cjs` creates incremental 300 px gallery thumbnails.
- `generate-display-images.cjs` creates compressed display-size variants.

Both scripts scan `src/campaigns/*/images/` during `npm run build`, skip SVGs,
and never send assets to an external service.
