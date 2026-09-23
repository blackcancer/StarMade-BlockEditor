# StarMade Block Editor 1.1.1 qualification

September 23, 2026. This patch integrates StarMade-3D 1.0.1 and its supplemental Display Module (479) rendering pipeline.

## Implementation and provenance

The archive is packed from the clean, qualified StarMade-3D commit `6e3b23392fcb0549b9db5e08b1dbe112e96a6532`, the peeled `v1.0.1` tag and verified remote main. The library's release fingerprint check passed before packing. `vendor/manifest.json` pins the archive SHA-256 and npm integrity; Three.js remains shared at 0.164.1. Decoder remains at 2.0.0.

The physical block still uses native encoded geometry and cube shaders. Block 479 additionally uses `createStarMadeDisplayPanel`, with the native screen texture, Monda font, face matrix, unlit depth-tested materials and text distance cutoff. The editor supplies only the sample text `Display`; it does not load blueprint entity text or invent live power/shield values. Supplemental meshes do not cast shadows. The same scene is used for orthographic icon export.

Only two fixed installation paths are exposed by the new resource routes: `data/image-resource/screen-gui-blue.png` and `data/font/Monda-Regular.ttf`. Missing resources fail visibly. Path confinement rejects symlinks escaping the installation. Switching blocks or orientations releases the old panel, screen texture and font, including failed and obsolete asynchronous loads.

## Automated checks

- `npm run validate`: 6 tooling tests, 151 server tests and 278 client tests passed; documentation, TypeScript, vendor verification and production build passed.
- Blocking coverage: all 47 executable files in `server/src` and `client/src` have exactly 100% lines and branches, with no missing files or ignore directives. Server: 852/852 lines, 710/710 branches. Client: 1435/1435 lines, 939/939 branches.
- The new tests exercise native face matrices, screen/font ownership, text visibility, failures at each loading stage, native cube/panel composition and confined resource endpoints.
- `npm audit --audit-level=low`: zero reported vulnerabilities.
- A clean independent production installation uses `npm ci --omit=dev` and the committed lockfile.

## Real browser checks

`npm run test:browser` includes `scripts/display-browser-check.mjs`. It loads the built production UI in Chromium with SwiftShader WebGL2, on a disposable installation copy. No native Display implementation is mocked.

For each of the six orientations, the recipe compares actual GPU pixels with the screen hidden and with only the text hidden. Each face produces more than 186,000 changed screen pixels and 1,374 changed glyph pixels at the tested viewport size. The recipe verifies the native cube shader, unlit screen material, loaded Monda font, successful GPU programs and zero WebGL errors. It generates a transparent 64 × 64 PNG through the editor UI and checks that switching away removes the Display layer and font.

All 12 browser checks passed with no JavaScript errors or failed requests. Source SHA-256 before and after: `bf1b8f405006147c95334e2a9333b291ce1fb42f22dcfcdf0c284411d1e262c3`.

The shared recipe also covers creation, persistence, conflicts, deletion, original icon restoration and French/English mobile workflows. Source data is hashed before and after the recipe. Reports and screenshots are retained in `release/qualification-1.1.1/`.

## Scope

The six-face checks isolate the preview object from the editor's floor/grid to observe every face, including the underside. The application remains responsible for the actual shader updates and scene construction. Browser font rasterization can differ from the Java client; pixel-identical StarMade output is not claimed. This run does not qualify physical phones, Safari/iOS, hardware GPU performance or live game-manager values.

## Exact coverage by file

| Executable file | Lines | Branches |
| --- | ---: | ---: |
| `server/src/api/assets.ts` | 110/110 | 91/91 |
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
| `client/src/3d/displayPreview.ts` | 14/14 | 4/4 |
| `client/src/3d/geometries/index.ts` | 8/8 | 2/2 |
| `client/src/3d/nativePreview.ts` | 78/78 | 44/44 |
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
