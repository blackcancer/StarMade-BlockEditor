# StarMade Block Editor 1.1.2 qualification

September 23, 2026. Update to StarMade-3D 1.0.2, pinned at `237f95687c6fac468728c71240ca300243bc2db0`. The remote `v1.0.2` tag resolves to this commit. The SDK source fingerprint release check passed before packing; `vendor/manifest.json` records archive integrity and provenance. Decoder remains 2.0.0: the rendering SDK has no runtime Decoder dependency.

## Changes

The editor advances the native Display scanline clock every rendered frame. Native text visibility now follows the SDK's 500-unit default. Screen, font and shader sources remain installation-owned; no proprietary assets are bundled. The fixed demonstration text remains `Display`, without simulated ship values. Existing mobile frame suspension and icon export are retained.

## Validation

- Clean `npm ci`, vendor verification, documentation, TypeScript, production build and all tests passed.
- 151 server tests, 278 client tests and 6 tooling tests passed.
- Blocking coverage: 47 executable files, each at 100% lines and branches, with no omissions or coverage ignore directives. Server: 852/852 lines and 710/710 branches. Client: 1436/1436 lines and 939/939 branches.
- `npm audit --audit-level=low`: zero reported vulnerabilities.
- Display browser checks read the actual GPU `uTime` uniform and require it to advance. They also compare screen/text pixels in all six orientations and verify generated PNG dimensions, cleanup and shader compilation.

Unit visibility assertions follow the documented new native distance contract; thresholds and required executable coverage remain unchanged. Browser checks use real Chromium/SwiftShader WebGL2 and disposable copies of the current installation. They do not establish native-client pixel identity, physical-phone support or hardware GPU performance.

All 12 browser checks passed, with no JavaScript errors or failed requests. Source SHA-256 before and after: `b5f8a6d7cc9c69a866a6e7da63d44881d7069196b9cc5d052106b6ab24f1f97c`. Detailed local evidence is retained in `release/qualification-1.1.2/`.

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
| `client/src/3d/nativePreview.ts` | 79/79 | 44/44 |
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
