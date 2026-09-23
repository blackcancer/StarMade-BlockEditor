# StarMade-BlockEditor 1.1.0 qualification

September 23, 2026. Delivery of StarMade-Decoder 2.0.0 and StarMade-3D 1.0.0 integration, icon export, the mobile interface and six interface languages.

## Result

**PASS for the editor scope described below.** The gate covers every executable file in `server/src` and `client/src`, including entry points. The coverage debt identified by the initial audit has been resolved; no production code exclusions or coverage ignore directives are used.

| Check | Result |
| --- | --- |
| Provenance and SHA-256 of both SDK archives | PASS, `npm run vendor:check` |
| Documentation and server/client types | PASS, 46 sources |
| Server tests | 150 passed |
| Client tests | 275 passed |
| Coverage-gate and archive-verification tests | 6 passed |
| Server coverage | 846/846 lines; 700/700 branches |
| Client coverage | 1416/1416 lines; 933/933 branches |
| Independent blocking gate | 46 files at 100% lines and branches; none missing or ignored |
| Production build | PASS, TypeScript and Vite |
| Clean `npm ci` installation | PASS with Node 22; separate production installation also passed |
| `npm audit` | 0 reported vulnerabilities in the locked dependency graph |
| Browser acceptance on a disposable copy | PASS, 11 checks, no JavaScript errors |
| Native WebGL2 rendering | PASS, 124 observations |
| PNG export | PASS, 9 captures and comparison with existing icons |
| Public preview | PASS, anonymous HTTPS access on 8003, with no mutation requests during verification |

Commands executed: `npm run validate`, followed by `npm run test:browser` with `STARMADE_DIR=/srv/StarMade` and Chromium. Validation covers the final code, including focus restoration and touch target dimensions. `npm run release:check` runs both checks for a complete reproduction. Detailed reports are collected in `release/qualification-1.1.0/` and in the delivery archive.

## Persistence and integration

The browser loaded 1516 definitions. Tests cover preservation of XML attributes and extensions, input validation, atomic writes with backups, revision checks and stale asynchronous responses. Deleting an override restores the vanilla block. Acceptance-test writes use only a disposable copy.

Source hash before **and** after the acceptance check: `331b3289f03b876f671155aeb913e6fdc6543fe96d13151b01b56d81e90673c7`. The check covers all source directories copied by the script, including configuration, shaders, LOD models, textures and icons.

Final acceptance checks:

- Catalogue loading and confinement to the configured installation.
- Block search and selection.
- Creation, saving and reloading with XML subtree preservation.
- Rejection of a stale save with a visible error and the draft retained.
- Draft preservation after reloading, followed by explicitly restoring the server version.
- Override deletion and immediate reappearance of the vanilla definition.
- Icon import, original backup and exact slot restoration.
- Native wedge generation, preview, application and exact restoration.
- Persistent deletion of a custom block.
- French mobile workflow: retained language, capture from Properties, editing and accessible dialogs.
- The same mobile workflow in English, with focus restoration verified.

## Rendering and icons

The native matrix covers all seven styles, 88 orientations, slabs, animations, lights, transparency, LOD models, custom textures and graphics context loss/restoration. Shaders were compiled in a real Chromium/SwiftShader WebGL2 context.

Icons are transparent 64 × 64 pixel PNGs captured with a standardized orthographic camera. The reference cube and generated cube occupy pixels 8 through 55 on both axes. The comparison checks three face regions with a maximum tolerance of 12 per RGB channel. Captures also cover wedges, slabs, LOD, glass and active/inactive lights. Export is independent of the interactive orbit and restores the camera, uniforms and renderer settings.

On mobile, capture before the first visit to the preview produces exactly the same PNG as on desktop. The hidden renderer stops producing frames; it resumes and resizes when returning to the Preview tab. Generation alone changes no files: the user must apply the icon and can subsequently restore the original slot.

## Mobile and languages

Three tabs at widths up to 1024 pixels preserve the draft and keep panels mounted. Native dialogs contain focus and restore it when closed. Help is accessible through touch and keyboard. Navigation and header controls are at least 44 pixels in all six languages at a viewport width of 360 pixels.

Acceptance checks cover French and English at 390 × 844, language persistence, editing/saving, texture/icon pickers and generation from Properties. The public link was checked at 360 × 800, 390 × 844, 768 × 1024, 844 × 390 and 1440 × 1000, without horizontal page overflow.

Each language has **396 entries**: 363 strings and 33 formatting functions, in English, French, German, Spanish, Russian and Japanese. Tests verify matching structure, parameters, plurals, diagnostics and native warnings. Names and descriptions supplied by the game and XML identifiers remain game data; unknown diagnostics remain available in a technical details panel.

## Deployment and verification limits

Direct address: **https://initsysrev.net:8003/**, without a token or login. The dedicated service uses Node 22 and an independent game copy; the HTTPS proxy forwards to the local backend on 38475. Configuration and data in that copy are preserved when replacing the release directory.

Graphical checks ran with Chromium on Linux and SwiftShader, with emulated mobile dimensions and interactions. No physical phone, Safari/iOS or Windows launcher execution was qualified in this environment. No import into or restart of the running StarMade game was performed. The percentages above qualify the editor; they do not claim to remeasure the complete internal test suites of both SDKs.

## Exact coverage by file

| Executable file | Lines | Branches |
| --- | ---: | ---: |
| `server/src/api/assets.ts` | 104/104 | 81/81 |
| `server/src/api/blocks.ts` | 58/58 | 24/24 |
| `server/src/api/config.ts` | 55/55 | 53/53 |
| `server/src/api/textures.ts` | 263/263 | 125/125 |
| `server/src/app.ts` | 52/52 | 66/66 |
| `server/src/assets/assetPaths.ts` | 29/29 | 23/23 |
| `server/src/assets/nativeImage.ts` | 53/53 | 47/47 |
| `server/src/assets/textureSources.ts` | 8/8 | 4/4 |
| `server/src/index.ts` | 10/10 | 7/7 |
| `server/src/services/atomicFile.ts` | 22/22 | 17/17 |
| `server/src/services/blockCatalog.ts` | 68/68 | 67/67 |
| `server/src/services/blockDto.ts` | 105/105 | 172/172 |
| `server/src/utils/path.ts` | 19/19 | 14/14 |
| `client/src/3d/BlockMesh.tsx` | 12/12 | 8/8 |
| `client/src/3d/BlockViewer.tsx` | 63/63 | 49/49 |
| `client/src/3d/captureIcon.ts` | 64/64 | 25/25 |
| `client/src/3d/geometries/index.ts` | 8/8 | 2/2 |
| `client/src/3d/nativePreview.ts` | 73/73 | 42/42 |
| `client/src/3d/renderAssets.ts` | 38/38 | 16/16 |
| `client/src/3d/renderBlock.ts` | 26/26 | 33/33 |
| `client/src/App.tsx` | 60/60 | 55/55 |
| `client/src/components/editor/AtlasPicker.tsx` | 102/102 | 63/63 |
| `client/src/components/editor/FaceSelector.tsx` | 26/26 | 18/18 |
| `client/src/components/editor/IconField.tsx` | 59/59 | 50/50 |
| `client/src/components/editor/IconPicker.tsx` | 68/68 | 24/24 |
| `client/src/components/layout/MobileNavigation.tsx` | 22/22 | 7/7 |
| `client/src/components/layout/Properties.tsx` | 77/77 | 60/60 |
| `client/src/components/layout/Viewer.tsx` | 16/16 | 24/24 |
| `client/src/components/layout/advancedProperties.tsx` | 169/169 | 170/170 |
| `client/src/components/layout/blockDisplay.ts` | 20/20 | 28/28 |
| `client/src/components/layout/propertyControls.tsx` | 25/25 | 17/17 |
| `client/src/components/layout/propertyOptions.ts` | 39/39 | 20/20 |
| `client/src/components/sidebar/BlockList.tsx` | 41/41 | 42/42 |
| `client/src/hooks/useApi.ts` | 94/94 | 96/96 |
| `client/src/hooks/useModal.ts` | 9/9 | 4/4 |
| `client/src/i18n/de.ts` | 34/34 | 4/4 |
| `client/src/i18n/en.ts` | 34/34 | 4/4 |
| `client/src/i18n/es.ts` | 34/34 | 4/4 |
| `client/src/i18n/fr.ts` | 34/34 | 4/4 |
| `client/src/i18n/index.ts` | 21/21 | 16/16 |
| `client/src/i18n/ja.ts` | 34/34 | 0/0 |
| `client/src/i18n/messages.ts` | 54/54 | 24/24 |
| `client/src/i18n/ru.ts` | 43/43 | 20/20 |
| `client/src/main.tsx` | 1/1 | 0/0 |
| `client/src/store/blockStore.ts` | 14/14 | 4/4 |
| `client/src/store/configStore.ts` | 2/2 | 0/0 |
