# Meadow Ln Viewer

Static split-shell SOGS viewer for the Meadow Lane compressed bundle.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server serves the repo root (default **5173**; if that port is busy, Vite uses the next free one—check the terminal for the URL). `/` redirects to `/3d/`.

Developer tools in the shell (splat position/rotation helpers) are **on by default**. Add `?dev=0` to the URL to hide them.

## KML lot-line import

The viewer now defaults to the bundled Incognito lot boundary from `3d/assets/incognito_lot_line.kml`. Open the lot-line editor to inspect it, or choose another `.kml` file from the KML field, then use **Scale**, **Center X/Y/Z**, and **Rotation** to align the imported boundary around the splat. KML coordinates are treated as relative geometry and centered around the viewer origin because the splat does not currently carry real-world coordinates.

The importer prefers `Polygon > outerBoundaryIs > LinearRing > coordinates`, ignores inner holes, supports namespaced KML tags, and falls back to closed `LinearRing`/coordinate blocks when no Polygon is present. Run `npm run test:kml` to check the regression cases.

## Tap-dot photos

Tap dots are on by default. The example dots are configured in `3d/index.js` under `CANYON_VISTA_TAP_DOTS`, and the sample image assets live in `3d/assets/tapdots/`.

Each dot has a world `position`, a `caption`, and a `photos` array. Photo entries can be repo-local paths like `assets/tapdots/front-entry.svg`, root-relative paths like `/media/front.webp`, or full remote URLs like `https://media.example.com/incognito/front.webp`.

## Repo structure

- `3d/`: shell app
- `supersplat-viewer/`: renderer app
- `index.html`: root redirect for GitHub Pages and local startup

## Default bundle

The shell defaults to this **meta.json** (same folder as the splat assets):

`https://spaceport-ml-processing-staging.s3.amazonaws.com/compressed/meadow-brassmatch-compress-20260410-130344-public/supersplat_bundle/meta.json`

The iframe loads **`background_skybox.webp` in the same directory** as `meta.json` (see also `background_manifest.json` in that folder).

### Staging bucket

The bucket policy allows public **`GetObject`** on `compressed/*`. Bundle objects use **SSE-S3 (AES256)** so browsers can read them without SigV4. **CORS** includes common dev localhost origins (including alternate ports when 5173 is taken) so `npm run dev` can fetch the bundle directly.

Direct object URIs (for tools / AWS CLI):

- `s3://spaceport-ml-processing-staging/compressed/meadow-brassmatch-compress-20260410-130344-public/supersplat_bundle/meta.json`
- `s3://spaceport-ml-processing-staging/compressed/meadow-brassmatch-compress-20260410-130344-public/supersplat_bundle/background_skybox.webp`
- `s3://spaceport-ml-processing-staging/compressed/meadow-brassmatch-compress-20260410-130344-public/supersplat_bundle/background_manifest.json`
