# StarMade Block Editor

Visual block editor for **StarMade** with a 3D preview, texture atlas editing, icon selection, and safe custom BlockConfig persistence.

The application reads the vanilla StarMade block data, lets you edit or create blocks in a graphical interface, and writes changes to StarMade's custom configuration files instead of modifying the original game files directly.

---

## Features

- **3D block preview** with StarMade-style geometry and atlas UV mapping.
- **Supported shapes:** Cube, Wedge, Corner, Cross, Tetra, Penta, and Hepta-as-cube fallback.
- **Face texture editor** using the StarMade composite atlas.
- **Custom atlas manager** for importing a complete custom atlas or replacing individual custom tiles.
- **Build icon picker** with icon sheet preview and custom icon import.
- **Block properties editor** for identity, stats, shape, rendering, flags, lighting, variants, and advanced BlockConfig fields.
- **Vanilla + custom block workflow:** vanilla blocks are read from the game, edits are saved as custom overrides.
- **Search and filters** for vanilla, custom, deprecated blocks, names, type names, and IDs.
- **Multi-language UI:** English, French, German, Spanish, Russian, and Japanese.
- **Production startup scripts** for Windows and Linux/macOS/WSL.

---

## Requirements

- **Node.js 18+** recommended, Node.js 20+ preferred.
- **npm**.
- A local **StarMade installation**.

The app can run from Windows, Linux, macOS, or WSL. Windows paths such as `D:\Games\StarMade` are normalised automatically when the server runs under WSL.

---

## Quick start

### Windows

```bat
start.bat
```

### Linux / macOS / WSL

```bash
./start.sh
```

The startup scripts will:

1. verify that Node.js and npm are available;
2. install dependencies if `node_modules` is missing;
3. build the production server/client if `dist` output is missing;
4. start the app in production mode;
5. open the browser at:

```text
http://localhost:3847
```

Force a rebuild before starting:

```bash
./start.sh --rebuild
```

```bat
start.bat --rebuild
```

Use a custom port:

```bash
PORT=8080 ./start.sh
```

```bat
set PORT=8080
start.bat
```

---

## First launch

On first launch, the app asks for your StarMade installation directory.

Examples:

```text
D:\Jeux\Steam\steamapps\common\StarMade\
```

```text
/mnt/d/Jeux/Steam/steamapps/common/StarMade/
```

The server resolves nested StarMade folders automatically. A directory is valid when the expected StarMade files such as `data/config/BlockConfig.xml` can be found.

The editor stores its local configuration in:

```text
SMToolConfig.json
```

---

## Manual development workflow

Install dependencies:

```bash
npm install
```

Start the development servers:

```bash
npm run dev
```

Development URLs:

```text
Client: http://localhost:5174
API:    http://localhost:3847
```

Build production output:

```bash
npm run build
```

Start production server after build:

```bash
npm start
```

Run tests:

```bash
npm test
```

Check documentation coverage:

```bash
npm run docs:check
```

---

## npm scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the API server and Vite client for development. |
| `npm run build` | Builds the server and client production output. |
| `npm start` | Starts the production Express server. |
| `npm run preview` | Builds then starts the production app. |
| `npm test` | Runs server and client tests. |
| `npm run coverage` | Runs coverage for server and client tests. |
| `npm run docs:check` | Verifies production-source JSDoc coverage. |

---

## Project structure

```text
StarMade-BlockEditor/
├── start.sh                 # Linux/macOS/WSL startup script
├── start.bat                # Windows startup script
├── package.json             # npm workspace scripts
├── SMToolConfig.json        # local editor configuration
├── docs/
│   ├── guide_en.md          # user guide
│   └── CODEBASE_DOCUMENTATION.md
├── client/
│   └── src/
│       ├── 3d/              # Three.js / React Three Fiber preview
│       ├── components/      # UI panels, sidebar, editor modals
│       ├── hooks/           # API loading and mutation hooks
│       ├── i18n/            # translation dictionaries and locale store
│       └── store/           # Zustand stores
└── server/
    └── src/
        ├── api/             # config, block, and texture endpoints
        ├── utils/           # path normalisation helpers
        └── index.ts         # Express app entry point
```

---

## How saving works

The editor does **not** rewrite the vanilla StarMade `BlockConfig.xml` directly.

When you save a vanilla block, the app creates or updates a custom override in StarMade's custom block configuration. This keeps the original game data intact and makes custom changes easier to back up or remove.

Unknown or advanced XML fields are preserved through `extraProperties` so that loading and saving a block does not silently drop StarMade metadata that the UI does not expose as a first-class field yet.

---

## Texture atlas mapping

The StarMade atlas is represented as a 4×2 page grid. Each page contains 16×16 tiles.

| Page | Source | Tile IDs |
|---|---|---|
| 0 | `t000.png` | `0–255` |
| 1 | `t001.png` | `256–511` |
| 2 | `t002.png` | `512–767` |
| 3 | `t003.png` | `768–1023` |
| 4–6 | reserved / empty | `1024–1791` |
| 7 | `custom.png` | `1792–2047` |

Normal maps use the same layout with the `_NRM` suffix.

---

## Documentation

User guides:

- English: [`docs/guide_en.md`](docs/guide_en.md)
- Français: [`docs/guide_fr.md`](docs/guide_fr.md)
- Deutsch: [`docs/guide_de.md`](docs/guide_de.md)
- Español: [`docs/guide_es.md`](docs/guide_es.md)
- Русский: [`docs/guide_ru.md`](docs/guide_ru.md)
- 日本語: [`docs/guide_ja.md`](docs/guide_ja.md)

Maintainer documentation:

- Codebase documentation: [`docs/CODEBASE_DOCUMENTATION.md`](docs/CODEBASE_DOCUMENTATION.md)
- Inline source documentation: JSDoc in `client/src` and `server/src`

---

## Production validation checklist

Before packaging or distributing a build, run:

```bash
npm run docs:check
npm test
npm run build
```

Recommended browser smoke checks:

1. App opens and loads the block list.
2. StarMade directory is detected as valid.
3. Search and select a vanilla block.
4. Change a draft field and save as custom.
5. Reload and confirm persistence.
6. Open the atlas picker and icon picker.
7. Toggle light/activation preview on a light-emitting block.
8. Test a non-cube shape and a Cross/cutout block.
