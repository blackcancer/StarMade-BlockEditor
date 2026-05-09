# StarMade Block Editor

> Visual block editor for StarMade — 3D preview with full texture atlas mapping.

---

## Features

- **3D block preview** — all 6 block shapes (Cube, Wedge, Corner, Cross, Tetra, Penta) with per-face UV mapping from the StarMade texture atlas
- **Texture atlas picker** — click any face of the 3D block to open a 16×16 atlas tile selector
- **All block fields** — edit HP, mass, volume, price, armor, flags, light source, variants
- **Vanilla + custom blocks** — reads 1 500+ vanilla blocks, writes only to `customBlockConfig/BlockConfigImport.xml`
- **Orientation preview** — cycle through all block orientations with live 3D update
- **Search and filter** — find blocks by name, type ID, or numeric ID

---

## Quick start

```bash
npm install
npm run dev
```

- **Client:** http://localhost:5174
- **API:**    http://localhost:3847

On first launch, enter your StarMade installation path in the config dialog.

---

## Architecture

```
StarMade-BlockEditor/
├── server/        # Express API (TypeScript)
│   └── src/api/
│       ├── config.ts    # Read/write SMToolConfig.json (starmadeDir)
│       ├── blocks.ts    # Read vanilla BlockConfig.xml + write customBlockConfig/
│       └── textures.ts  # Serve atlas PNG + extract individual tiles (sharp)
│
├── client/        # React + react-three-fiber (TypeScript)
│   └── src/
│       ├── 3d/
│       │   ├── geometries/   # 6 block shapes ported from StarOS BPViewer
│       │   ├── BlockMesh.tsx # Mesh with UV atlas + orientation
│       │   ├── BlockViewer.tsx # r3f Canvas + OrbitControls
│       │   └── AtlasTexture.ts # Atlas loader + UV helpers
│       ├── components/
│       │   ├── sidebar/BlockList.tsx    # Block list with search + filters
│       │   ├── editor/FaceSelector.tsx  # 6-face texture picker
│       │   ├── editor/AtlasPicker.tsx   # 16×16 atlas tile picker
│       │   └── layout/Properties.tsx   # All block field editors
│       ├── store/  # Zustand state
│       └── hooks/  # API fetch hooks
│
└── SMToolConfig.json   # starmadeDir (gitignored)
```

---

## Block shapes

Ported from StarOS BPViewer (`starmade_gl.js` by @Blackcancer):

| BlockStyle | Shape | Description |
|---|---|---|
| 0 | **Cube** | Standard block — 6 quads, 3 UV modes (1/3/6 sides) |
| 1 | **Wedge** | Sloped triangular prism |
| 2 | **Corner** | L-corner, 5-vertex shape |
| 3 | **Cross** | Two crossed planes (flora, vines) — DoubleSide |
| 4 | **Tetra** | Tetrahedron, 4 faces |
| 5 | **Penta** | Pentagon prism (hepta-family) |
| 6 | **Hepta** | Rendered as Cube |

---

## Requirements

- Node.js 18+
- StarMade installation (for texture atlas and block config)
