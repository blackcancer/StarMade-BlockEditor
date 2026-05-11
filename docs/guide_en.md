# StarMade Block Editor — User Guide

This guide explains how the StarMade Block Editor works from a user point of view: how to start it, configure it, browse blocks, edit properties, change textures/icons, and save custom blocks.

---

## 1. What the app does

StarMade Block Editor is a local web application for editing StarMade block definitions visually.

It has two parts:

- a **server** that reads/writes StarMade files and serves texture/icon data;
- a **browser UI** that shows the block list, 3D preview, texture pickers, and properties editor.

In production mode both parts are served from one address:

```text
http://localhost:3847
```

The editor reads vanilla StarMade block data, but saved edits are written as custom overrides. The goal is to avoid destructive edits to the original game configuration.

---

## 2. Starting the app

### Windows

Double-click or run:

```bat
start.bat
```

### Linux / macOS / WSL

Run:

```bash
./start.sh
```

The startup script checks dependencies, builds the app if needed, starts the server, and opens the browser.

If you want to force a fresh production build:

```bash
./start.sh --rebuild
```

```bat
start.bat --rebuild
```

---

## 3. First configuration

On first launch the app asks for your StarMade installation directory.

Examples:

```text
D:\Jeux\Steam\steamapps\common\StarMade\
```

```text
/mnt/d/Jeux/Steam/steamapps/common/StarMade/
```

The app validates the directory by looking for StarMade files such as:

```text
data/config/BlockConfig.xml
```

If you run the server from WSL but StarMade is installed on Windows, Windows paths are converted automatically to `/mnt/<drive>/...` paths.

The configuration is stored locally in:

```text
SMToolConfig.json
```

---

## 4. Main interface overview

The app is organised into three main columns.

```text
Sidebar | 3D Viewer | Properties
```

### Sidebar

The sidebar lists loaded blocks. You can:

- search by name, XML type name, or ID;
- show/hide vanilla blocks;
- show/hide custom blocks;
- show/hide deprecated blocks;
- click a block to edit it.

### 3D Viewer

The viewer shows the selected block using StarMade-like geometry and texture mapping.

You can:

- rotate/zoom/pan the camera;
- cycle block orientation;
- toggle active/inactive preview state;
- preview light-emitting blocks;
- choose which face texture to edit.

### Properties panel

The properties panel edits the current draft block. It contains grouped fields for:

- identity and description;
- icon;
- hitpoints, mass, volume, price, armour;
- shape and texture behaviour;
- rendering flags;
- logic/door/shop/deprecated flags;
- light colour and intensity;
- slab/style variants;
- advanced BlockConfig properties.

---

## 5. Editing workflow

1. Select a block from the sidebar.
2. The block appears in the 3D viewer.
3. The properties panel creates an editable draft.
4. Change fields, textures, icon, or advanced properties.
5. Save the draft.
6. The server writes the custom block data and reloads the updated block list.

Important: selecting and editing a vanilla block does not directly modify the vanilla StarMade file. Saving promotes the edit to a custom block override.

---

## 6. Saving and custom blocks

When you save:

- vanilla blocks become custom overrides;
- already custom blocks are updated;
- unknown XML properties are preserved when possible;
- the UI marks the block as custom.

This design keeps StarMade's original data safe and makes it easier to recover by removing the custom override instead of restoring a full game file.

---

## 7. Creating a new block

Use the **New block** button in the header.

The app creates a new custom block with default values, selects it, and opens it in the editor. You can then change its name, ID-related metadata, textures, stats, and advanced properties before saving.

---

## 8. Texture editing

### Face selector

Under the 3D preview, the face selector shows editable face buttons depending on the block's `IndividualSides` mode:

- **1 side:** all faces share one texture;
- **3 sides:** grouped front/back, top/bottom, left/right;
- **6 sides:** each face can have its own texture.

Click a face button to open the atlas picker.

### Atlas picker

The atlas picker displays the StarMade composite atlas.

Click a tile to assign it to the selected face. The block preview updates using the selected tile ID.

Tile ID layout:

| Page | Source | IDs |
|---|---|---|
| 0 | `t000.png` | `0–255` |
| 1 | `t001.png` | `256–511` |
| 2 | `t002.png` | `512–767` |
| 3 | `t003.png` | `768–1023` |
| 4–6 | reserved | `1024–1791` |
| 7 | `custom.png` | `1792–2047` |

### Custom atlas manager

The atlas manager lets you:

- import a full custom atlas;
- replace one custom tile;
- choose diffuse or normal map import mode.

After an import, the app refreshes atlas caches so the picker and 3D preview use the new image.

---

## 9. Icon editing

Click the icon control in the properties panel to open the icon picker.

The icon picker shows StarMade build icon sheets. Selecting an icon writes its numeric icon ID to the block draft.

Custom icon import is supported when the corresponding UI action is available.

---

## 10. Shape and rendering rules

The editor supports the main StarMade `BlockStyle` shapes:

| BlockStyle | Shape |
|---|---|
| 0 | Cube |
| 1 | Wedge |
| 2 | Corner |
| 3 | Cross |
| 4 | Tetra |
| 5 | Penta |
| 6 | Hepta / cube fallback |

Important preview behaviours:

- Cross/cutout blocks use texture alpha even if the `Transparency` flag is disabled.
- Animated textures step through consecutive atlas tiles.
- Activation textures use the adjacent tile according to StarMade rules.
- Slab values change the preview thickness.
- Orientation changes rotate asymmetric shapes in the viewer.

---

## 11. Light preview

Blocks with `LightSource` enabled can be previewed as active lights.

The light colour uses the `LightSourceColor` array:

```text
[r, g, b, intensity]
```

The first three values define colour channels, and the fourth controls intensity. The preview clamps values to keep the viewport readable.

---

## 12. Advanced properties

StarMade BlockConfig contains many specialised fields for resources, factories, chambers, controllers, collision, LOD, logic, and gameplay behaviour.

The advanced editor exposes structured controls for common fields and keeps unknown fields in the block's extra property data so they can survive load/save cycles.

If you are unsure what an advanced property does, leave it unchanged.

---

## 13. Language selector

The header contains a language selector.

Supported languages:

- English
- French
- German
- Spanish
- Russian
- Japanese

The selected locale changes UI labels and help text. It does not change saved StarMade block data.

---

## 14. Recommended safe workflow

Before heavy editing:

1. Back up your StarMade custom block files.
2. Start the editor.
3. Edit one block at a time.
4. Save.
5. Reload the app and verify the saved values.
6. Test the block in StarMade if the change affects gameplay.

Suggested files/folders to back up depend on your StarMade installation, but custom block config and custom texture folders are the most important.

---

## 15. Troubleshooting

### The app says the StarMade directory is invalid

Check that the selected folder contains or resolves to:

```text
data/config/BlockConfig.xml
```

If your install has a nested `StarMade/StarMade` folder, try selecting either the outer folder or the inner folder. The resolver handles both in most cases.

### Textures do not update after import

Try:

1. reopening the atlas picker;
2. using the reload textures button in the atlas manager;
3. restarting the app if the browser cached an old image.

### The browser does not open automatically

Open manually:

```text
http://localhost:3847
```

If you changed `PORT`, use that port instead.

### A build fails

Run manually from the project root:

```bash
npm install
npm run build
```

Then restart with:

```bash
./start.sh --rebuild
```

or:

```bat
start.bat --rebuild
```

---

## 16. For maintainers

Useful commands:

```bash
npm run docs:check
npm test
npm run build
```

Additional codebase documentation is available in:

```text
docs/CODEBASE_DOCUMENTATION.md
```
