# StarMade Block Editor — Codebase Documentation

This document complements the inline JSDoc comments in `client/src` and `server/src`. Its purpose is to give production maintainers a complete map of the codebase: where responsibilities live, how data moves through the app, and what invariants must be preserved when changing code.

## Documentation policy

Every production TypeScript/TSX source file must have:

1. a file-level overview explaining the module responsibility;
2. JSDoc on every exported function, type, interface, constant, hook, component, and router;
3. comments on non-obvious StarMade engine compatibility rules;
4. tests or a documented manual/CDP validation path for user-visible behavior.

Test files are intentionally documented through descriptive `describe`/`it` names and setup helpers rather than exhaustive JSDoc on each assertion.

## Runtime layout

- `client/` — React/Vite UI, Zustand stores, React Three Fiber preview, editor controls.
- `server/` — Express API for config, BlockConfig XML parsing/persistence, texture/icon atlas IO.
- StarMade game assets/config are read from the configured `starmadeDir`.
- User-visible dev ports used during validation:
  - UI: `http://localhost:5174`
  - API: `http://localhost:3847`

## Client architecture

### `client/src/App.tsx`

Application shell. It loads config/blocks through hooks, renders the header, sidebar, 3D viewer column, and properties panel. It should remain orchestration-only; heavy UI sections live in dedicated components.

### `client/src/store/*`

- `blockStore.types.ts` defines the block model, editor draft state, filters, and store action types.
- `blockStore.state.ts` creates initial state and mutation actions.
- `blockStore.ts` exposes the Zustand store and re-exports its public types.
- `configStore.ts` stores StarMade path, world, texture pack, atlas size, and validity.

Important invariant: the UI edits a `draft` block. Saving persists the draft and replaces the corresponding loaded block by numeric ID.

### `client/src/hooks/useApi*`

- `useApi.shared.ts` contains API constants and normalisation helpers.
- `useApi.loaders.ts` loads configuration and block lists.
- `useApi.mutations.ts` saves, deletes, and creates blocks.
- `useApi.ts` is the public barrel.

Important invariant: config and block loaders invalidate texture/name caches when data that affects rendering or display labels changes.

### `client/src/3d/*`

3D preview and StarMade geometry compatibility.

- `AtlasTexture.ts` loads/caches diffuse and normal atlases and maps tile IDs to UV rectangles.
- `BlockMesh.helpers.ts` contains pure preview helpers: activation/animation texture IDs, light colour/intensity, slab transforms, orientation quaternions, and alpha rules.
- `BlockMesh.tsx` renders one block mesh and optional point light.
- `BlockViewer.tsx` owns the React Three Fiber canvas, lighting rig, grid/floor, and active-light preview footprint.
- `geometryCache.ts` separates cached shape geometry from per-instance mutable UV buffers.
- `geometries/*` builds cube, wedge, corner, cross, tetra, and penta geometry/UVs.

Critical rendering invariants:

- Atlas page mapping follows StarMade/StarOS layout:
  - IDs `0–255` → `t000`
  - `256–511` → `t001`
  - `512–767` → `t002`
  - `768–1023` → `t003`
  - `1792–2047` → custom atlas page
- `Cross` blocks (`blockStyle === 3`) must honour texture alpha automatically even when `Transparency` is false.
- The `Transparency` flag must not change Cross/cutout rendering; it only controls blended transparency semantics for non-Cross blocks.
- Slabs are previewed vertically along Z, not horizontally along Y.
- Animated textures advance through four consecutive tiles, with the `individualSides === 3` top/bottom exception.
- Activation texture rule: if `hasActivationTexture && !active`, use `textureId + 1`; otherwise use base texture.

### `client/src/components/editor/*`

Editor modals and face/icon pickers.

- `FaceSelector.tsx` lets users choose which block face to edit and opens atlas selection/manager modals.
- `AtlasPicker.tsx` displays the 4×2 composite atlas, selects tiles, imports full custom atlases, and replaces custom tiles.
- `IconPicker.tsx` displays StarMade build-icon sheets and writes numeric icon IDs.

Important invariant: import actions dispatch `atlas-imported` so the 3D preview reloads textures.

### `client/src/components/layout/*`

Properties UI and reusable controls.

- `Properties.tsx` orchestrates draft editing, save/delete/create UI, icon imports, and modal state.
- `Properties.sections.tsx` contains the visible field sections: identity, stats, shape, rendering, flags, light, variants, and advanced extras.
- `advancedProperties.*` normalises and edits structured extra BlockConfig properties such as resources, recipes, factories, chambers, controllers, collision, LOD, and gameplay metadata.
- `propertyControls.*` contains shared labelled fields and readable block selectors.
- `propertyOptions.*` contains option lists, localised labels, group names, and property tooltips.
- `blockDisplay.ts` centralises display names and intentionally hides technical IDs/XML type names from normal UI.

UX invariant: the user should see readable names, not technical IDs or raw XML type names, except where a numeric value is genuinely editable data.

### `client/src/components/sidebar/BlockList.tsx`

Block filtering/search and selection list. The sidebar groups vanilla/custom/deprecated visibility filters and shows readable block names with icons.

### `client/src/i18n/*`

Translation dictionaries and the `useI18nStore` language store. `en.ts` defines the full `Translations` shape; other locale files provide translated dictionaries matching that structure.

## Server architecture

### `server/src/index.ts`

Express app bootstrap. Registers routers, middleware, and startup cache warming.

### `server/src/api/config.ts`

Configuration API. Validates StarMade directories, lists texture packs, and persists `SMToolConfig.json`.

### `server/src/api/blocks*`

- `blocks.types.ts` defines the server/client `BlockDef` contract.
- `blocks.core.ts` parses vanilla/custom BlockConfig XML, preserves unknown properties, serialises edits, and manages cache invalidation.
- `blocks.ts` exposes the block router endpoints.

Persistence invariant: vanilla edits are written to `customBlockConfig/BlockConfigImport.xml`, while unknown XML properties are preserved in `extraProperties` for round-trip safety.

### `server/src/api/textures*`

- `textures.types.ts` defines texture size/map types.
- `textures.core.ts` builds composite atlases, extracts tiles/icons, lists packs, writes custom atlases/tiles/icons, and warms caches.
- `textures.ts` exposes the texture/icon import and read endpoints.

IO invariant: all StarMade paths are resolved through the configured root and custom writes target StarMade's expected `customBlockTextures/<size>/` and icon resource locations.

### `server/src/utils/path.ts`

Cross-platform path normalisation for Windows/WSL host paths and StarMade root detection.

## Validation checklist for production/dist prep

Run these before shipping a production build:

```bash
npm test
npm run build
```

Recommended browser/CDP smoke tests:

1. App loads with block count and valid config.
2. Search/select `Gold Bar`; verify `Croix (style 3)` and Cross alpha independence from `Transparency`.
3. Open face atlas picker and icon picker.
4. Toggle a light-source preview ON/OFF.
5. Load representative non-cube styles 1–6.
6. Change slab values and verify preview geometry changes.
7. Switch language EN ⇄ FR.
8. Check console/runtime errors and broken images.

## Recent documentation audit status

A production-source audit currently covers all non-test files under:

- `client/src/**/*.ts(x)`
- `server/src/**/*.ts`

The audit requires file-level overview comments and JSDoc on every exported declaration, and the inline comments are written to explain purpose, parameters, return values, side effects, and StarMade-specific invariants rather than merely satisfying a syntactic check. At the time of this document pass, the production-source audit reported zero missing exported-declaration docs across 38 production source files.
