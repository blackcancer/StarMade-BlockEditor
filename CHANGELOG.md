# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project follows [Semantic Versioning](https://semver.org/).

---

## [1.1.2] — 2026-09-23

- Updated the pinned StarMade-3D archive to 1.0.2, including support for the updated native shader sources.
- Connected the Display scanline animation clock to the editor render loop and adopted the native 500-unit text visibility distance.
- Extended browser checks to verify the actual Display shader clock, six-face rendering and icon export with the new SDK.
- StarMade-Decoder remains at 2.0.0; StarMade-3D has no runtime Decoder dependency.

## [1.1.1] — 2026-09-23

- Made the custom atlas manager button span the viewer panel width, with wrapped labels and a 44-pixel minimum touch height on mobile.
- Fixed icon action sizing: import, restore and generate buttons now each span the available panel width, with wrapping for long translations.

- Updated the pinned StarMade-3D archive to 1.0.1.
- Added the native Display Module (479) screen/text pass to the existing physical cube, using installation-owned screen and Monda font resources.
- Matched all six native Display face frames and included the supplemental layer in orthographic icon exports.
- Kept demonstration text separate from block definitions: previews show “Display” without fabricating saved entity text or live ship values.
- Added confined Display resource routes, resource cleanup tests and real-browser screen/text pixel checks.

## [1.1.0] — 2026-09-23

- Integrated StarMade-Decoder 2.0.0 and StarMade-3D 1.0.0 using verified, pinned local archives.
- Native rendering for all seven styles, orientations, slabs, animations, lights, transparency and activatable LOD models.
- Orthographic 64 × 64 pixel PNG icon generation, framed to match existing cube icons, with a preview before applying and restoration of the original slot.
- Three-tab phone and tablet interface, touch controls, accessible dialogs and drafts preserved while navigating.
- Completed all six interface translations, including error messages, rendering warnings and advanced properties.
- Fixed the desktop header: aligned dropdowns and buttons, explicit spacing and adaptive height for narrower windows.
- Restored focus to the opening button after closing icon and texture pickers; paused 3D rendering while its panel is hidden on mobile.
- Preserved unknown XML attributes and structures; added atomic saves with backups, mandatory ETags and rejection of stale concurrent writes.
- Protected drafts and asynchronous responses, exposed errors clearly and confined the remote preview to a game copy.
- Required Node.js 22.16+, updated dependencies, enforced 100% line and branch coverage per file, and added browser acceptance checks on an isolated copy.
- Qualification: 425 application tests and 6 tooling tests passed; browser checks cover editing, native rendering, export and desktop/mobile layouts. See the qualification and header-fix reports in `docs/`.

## [1.0.0] — 2026-05-11

First stable release of StarMade Block Editor.

### Added

#### 3D interface

- Real-time 3D preview of all 6 block shapes (Cube, Wedge, Corner, Cross, Tetra, Penta)
- Per-face UV mapping from the StarMade texture atlas (64 × 32 tiles, 8 pages)
- OrbitControls (rotation, zoom) with damping
- Reference grid and preview floor
- Normal map support (StarMade's inverted Y convention)
- Active/inactive lighting preview (`LightSource`, `HasActivationTexture`)
- Radial light footprint to visualize emission range
- Vertical slab preview (3/4, 1/2, 1/4)
- Texture animation cycle (4 tiles × 0.5 s)

#### Property editor

- All `BlockConfig.xml` fields exposed: HP, mass, volume, price, armour, flags
- Light colour editor (picker, hex input, intensity slider and palette)
- Armour by damage type (Heat, Kinetic, EM)
- Variant selectors (slabIds, styleIds)
- 60+ advanced properties structured into dedicated sub-editors:
  - Resources / Recipes (Consistence, InRecipe, RecipeBuyResource…)
  - Factory / Production (ProducedInFactory, FactoryBakeTime…)
  - Reactor chambers (upgrade tree, capacity, groups…)
  - Controllers (ControlledBy, Controlling, combinations…)
  - Collision / Physics (None / BlockType / ConvexHull shapes)
  - LOD / Mesh (LodShape, activation animation style)
  - Logic / Gameplay (SensorInput, Beacon, ResourceInjection…)
  - Reactor / Structure, Inventory / Metadata, Other

#### Face and atlas pickers

- 6 face buttons with highlighting in the 3D viewer
- Support for `IndividualSides` modes (1 / 3 / 6 faces)
- Interactive atlas picker (picker and manager modes)
- Full custom atlas import (diffuse and normal)
- Individual tile replacement in the custom region (page 7, tiles 1792–2047)
- Build icon picker (6 sheets × 256 slots)
- Custom icon import

#### Data and API

- Read 1,500+ vanilla blocks from `BlockConfig.xml`
- Resolve IDs through `BlockTypes.properties`
- Write block definitions only to `customBlockConfig/BlockConfigImport.xml`
- Draft editing without immediate saving, with dirty-state tracking
- Automatically promote vanilla blocks to custom definitions on first save
- Invalidate the server cache using XML file modification times
- RESTful endpoints: `GET/PUT/POST/DELETE /api/blocks`, `/api/config`, `/api/textures`
- WSL support: automatic Windows ↔ WSL path conversion

#### Localization

- Zustand-based i18n with localStorage persistence
- Automatic browser language detection
- Language selector in the header
- **6 complete languages**: English, French, German, Spanish, Russian, Japanese
- 370+ strings per locale, including detailed StarMade tooltips

#### Quality

- Strict TypeScript — 0 errors across the project
- 121 tests (20 test files — client and server)
- 100% branch coverage (client)
- Comprehensive JSDoc documentation: every file, function, type and constant
- Annotated sources: `ElementInformation.java`, `starmade_gl.js`, `Occlusion.java`

#### Production build

- Vite code splitting: vendor-three / vendor-r3f / vendor-react / vendor-zustand
- Express production server serves the static client and API on a single port
- `PORT` environment variable for flexible deployment
- `npm run preview` script for local production-build testing

---

## [0.x] — Development history

| Commit | Description |
|---|---|
| `3942981` | feat: improve block preview textures and lighting |
| `67ab96e` | feat: slab preview and effect armour fields |
| `ce0ffdd` | feat: raw properties and vertical slabs |
| `70a268e` | feat: UI structure for additional properties |
| `af0570a` | feat: improve property panel UI |
| `4e81196` | feat: usable resource/recipe editor |
| `16d9d82` | feat: usable advanced property editors |
| `bd7deb2` | chore: simplify dropdown labels |
| `301bf01` | chore: hide technical IDs in the UI |
| `9e5ef1f` | chore: remove remaining technical labels |
| `b4e65dd` | docs: improve block property tooltips |
| `c4f6b10` | feat: centralize custom atlas imports |
| `0810f4a` | refactor: split the property panel |
| `4819b16` | refactor: extract control components |
| `b8a52e7` | refactor: extract advanced property editors |
| `44134fe` | test: unit coverage for core helpers |
| `201eb92` | test: expand UI and configuration coverage |
| `ee26012` | test: increase client coverage |
| `353ce85` | docs: comprehensive codebase documentation |
| `c776753` | feat: English and French i18n |
| `dcc1e23` | feat: German and Spanish localization |
| `3ad7b8e` | feat: Russian and Japanese localization |
