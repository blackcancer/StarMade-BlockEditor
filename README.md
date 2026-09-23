# StarMade Block Editor 1.1

A StarMade block editor using **StarMade-Decoder 2.0.0** for definitions and **StarMade-3D 1.0.0** for native rendering. The interface is available in English, French, German, Spanish, Russian and Japanese.

All six languages have the same 396 verified entries, including error messages, rendering warnings and mobile controls.

## Getting started

Requirements: **Node.js 22.16 or newer**, npm, a WebGL2 browser and a local StarMade installation containing its shaders and textures.

```bash
npm ci
npm run build
npm start
```

Open `http://localhost:3847`. The `./start.sh` and `start.bat` scripts install missing dependencies, build the application and open this address. Use `--rebuild` after an update. To choose another local port:

```bash
PORT=8003 ./start.sh --rebuild
```

On Windows: `set PORT=8003`, then `start.bat --rebuild`. The server listens on the local interface. Settings are stored in `SMToolConfig.json` in the working directory.

The installation must contain `data/config/BlockConfig.xml` and `BlockTypes.properties`. Custom files are not required on first launch. Windows paths are recognized under WSL.

## Phones and tablets

On narrow screens, the **Blocks**, **Preview** and **Properties** tabs provide access to the three panels. Your draft is preserved when switching panels. The preview supports touch controls, and settings remain accessible in the header. Image pickers scroll within their own dialogs.

## Editing and saving

Vanilla definitions remain intact: **Save to Custom** creates or updates an override in `customBlockConfig`. Deleting that override immediately reveals the vanilla definition again. StarMade-Decoder preserves unknown block XML attributes and structures when known fields are updated.

Each write backs up the previous bytes (`.backup-*`) and replaces the file by renaming a local temporary file. A catalogue revision protects against concurrent changes. If a conflict occurs, your draft remains available: note the values you want to keep, reload the catalogue, then choose **Revert** to load the latest definition before reapplying your changes. Switching blocks or installations and closing the page protect unsaved drafts.

Importing a texture or icon writes an image immediately, independently of saving the block definition. An icon may be shared by several blocks. **Restore original icon** restores only the selected slot from its original backup.

## Rendering and icon generation

Rendering uses StarMade-3D's native geometry, orientations, shaders, lighting and LOD models. Style 6 is **Normal, 24 orientations**. Active/inactive states, slab thicknesses, animated textures and normal maps follow the native data. The editor loads resources from the selected installation; proprietary game resources are not distributed.

In the block properties, **Generate from block** creates a transparent **64 × 64 pixel** PNG preview. The orthographic camera matches the angle and margins of existing cube icons: a centered cube with a 48 × 48 pixel footprint. The orientation and active state selected in the viewer are retained; the grid and selection highlight are excluded from the image. **Apply icon** writes the displayed slot. **Cancel** discards the preview. The interactive view is restored after export.

The texture picker displays 8 pages of 256 tiles: vanilla pages 0–3, reserved pages 4–6, and custom page 7 (IDs 1792–2047). Native layers are loaded separately for 3D rendering. TGA normal maps retain their material channels; a custom RGB file without an alpha channel receives zero alpha, with a warning in the preview.

## Development and qualification

```bash
npm run dev             # Vite :5174, local API :3847
npm run validate        # provenance, documentation, types, tests, coverage and build
npm audit               # direct and transitive dependencies
```

Coverage blocks delivery if **any executable file** in `client/src` or `server/src` fails to reach exactly **100% lines and branches**. Entry points are included. The independent gate rejects coverage ignore directives and files missing from the reports. HTML and JSON reports are available in `client/coverage` and `server/coverage`.

The release acceptance check uses a **temporary copy** of the game data, tests browser behavior and saves, then verifies that the source remains unchanged:

```bash
STARMADE_DIR=/path/to/StarMade CHROMIUM_PATH=/path/to/chromium npm run release:check
```

A missing installation fails this check; partial validation is not reported as complete. Shaders are compiled in a real WebGL2 context. Rendering has also been qualified with Chromium/SwiftShader; hardware GPU performance depends on the host machine.

## StarMade dependencies

The SDKs are not published on the public npm registry. Verified archives are therefore included in `vendor/`, without symlinks to neighboring repositories. `vendor/manifest.json` records versions, source commits and SHA-256 hashes; `npm run vendor:check` verifies the archives. The lockfile provides reproducible installation with `npm ci`.

- StarMade-Decoder: commit `4cb21bd72258c87eb8115f90449a8334c34658a6` (2.0.0).
- StarMade-3D: commit `bb80c2ebaccf262e944925a807671e67e4e15ac5` (1.0.0).

## Remote preview

An HTTPS proxy can expose the local server. `EDITOR_PUBLIC_ORIGIN` defines the allowed origin, and `EDITOR_FIXED_STARMADE_DIR` confines the editor to its test copy. The requested preview is directly accessible at **https://initsysrev.net:8003/**, without a token or login. The proxy preserves the Host header. See the [preview configuration](docs/PREVIEW_DEPLOYMENT.md).

Release results and limitations are documented in the [1.1.0 qualification report](docs/QUALIFICATION_1.1.0.md). The initial audit is retained in [AUDIT_INTEGRATION_2026-09-23.md](docs/AUDIT_INTEGRATION_2026-09-23.md). The [historical English user guide](docs/guide_en.md) describes the 1.0 interface; the saving, rendering and export behavior described on this page is authoritative for version 1.1.
