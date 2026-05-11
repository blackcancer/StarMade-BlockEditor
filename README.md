# StarMade Block Editor

> Éditeur visuel de blocs pour StarMade — prévisualisation 3D avec mappage complet de l'atlas de textures.

[![Tests](https://img.shields.io/badge/tests-121%20passed-brightgreen)]()
[![Coverage](https://img.shields.io/badge/branches-100%25-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![Langues](https://img.shields.io/badge/i18n-EN%20%7C%20FR%20%7C%20DE%20%7C%20ES%20%7C%20RU%20%7C%20JA-blueviolet)]()

---

## Fonctionnalités

- **Prévisualisation 3D** — 6 formes de blocs (Cube, Wedge, Corner, Cross, Tetra, Penta) avec mappage UV par face depuis l'atlas de textures StarMade
- **Sélecteur de faces** — cliquer sur une face du bloc 3D ouvre le sélecteur de tuiles de l'atlas (64×32 tuiles)
- **Atlas personnalisé** — importer un atlas complet ou remplacer une tuile individuelle (diffuse + normal map)
- **Tous les champs de blocs** — HP, masse, volume, prix, armure, flags, source de lumière, variantes, et 60+ propriétés BlockConfig avancées
- **Blocs vanilla + custom** — lit 1 500+ blocs vanilla, écrit uniquement dans `customBlockConfig/BlockConfigImport.xml`
- **Orientations** — cycle sur toutes les orientations avec mise à jour 3D en temps réel
- **Recherche et filtres** — trouver des blocs par nom, type XML ou ID numérique
- **Import d'icônes** — remplacer les icônes de construction directement depuis l'éditeur
- **Localisation complète** — 6 langues : Anglais, Français, Allemand, Espagnol, Russe, Japonais

---

## Prérequis

- **Node.js 18+**
- **Installation de StarMade** (pour l'atlas de textures et la configuration des blocs)

---

## Démarrage rapide (développement)

```bash
npm install
npm run dev
```

- **Interface :** http://localhost:5174
- **API :**       http://localhost:3847

Au premier lancement, saisir le chemin vers le répertoire d'installation de StarMade dans la boîte de dialogue de configuration.

---

## Build de production

```bash
# Build complet (serveur + client)
npm run build

# Lancer en mode production (port 3847 par défaut)
npm start

# Ou sur un port personnalisé
PORT=8080 npm start
```

En mode production, le serveur Express sert à la fois l'API (`/api/*`) et le client React pré-compilé depuis `client/dist/`.

### Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3847` | Port du serveur de production |
| `NODE_ENV` | — | Mettre à `production` pour activer le mode prod |

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre serveur API + client Vite en mode développement |
| `npm run build` | Compile serveur (tsc) + client (vite build) |
| `npm start` | Lance le serveur de production (après `build`) |
| `npm run preview` | Build puis lance en prod — test rapide du build |
| `npm test` | Lance tous les tests (serveur + client) |
| `npm run coverage` | Rapport de couverture complet |

---

## Architecture

```
StarMade-BlockEditor/
├── server/                    # API Express (TypeScript)
│   └── src/
│       ├── api/
│       │   ├── config.ts      # Lecture/écriture SMToolConfig.json
│       │   ├── blocks.ts      # CRUD BlockConfig.xml + customBlockConfig/
│       │   └── textures.ts    # Service atlas PNG + extraction de tuiles (sharp)
│       ├── utils/path.ts      # Normalisation chemins Windows/WSL
│       └── index.ts           # Point d'entrée Express
│
├── client/                    # React + react-three-fiber (TypeScript)
│   └── src/
│       ├── 3d/
│       │   ├── geometries/    # 6 formes portées depuis StarOS BPViewer
│       │   ├── BlockMesh.tsx  # Mesh avec UV atlas + orientation
│       │   ├── BlockViewer.tsx # Canvas r3f + OrbitControls
│       │   └── AtlasTexture.ts # Chargeur atlas + helpers UV
│       ├── components/
│       │   ├── sidebar/BlockList.tsx      # Liste de blocs avec recherche et filtres
│       │   ├── editor/FaceSelector.tsx   # Sélecteur de faces (6 boutons)
│       │   ├── editor/AtlasPicker.tsx    # Sélecteur de tuiles atlas
│       │   ├── editor/IconPicker.tsx     # Sélecteur d'icônes de construction
│       │   └── layout/
│       │       ├── Properties.tsx        # Éditeur de champs de blocs
│       │       ├── advancedProperties.tsx # Éditeurs avancés (recettes, chambres…)
│       │       ├── Viewer.tsx            # Colonne centrale avec contrôles d'orientation
│       │       ├── propertyControls.tsx  # Composants de contrôle réutilisables
│       │       └── propertyOptions.ts   # Options des sélects + tooltips
│       ├── i18n/              # Système de localisation (6 langues)
│       │   ├── index.ts       # Store Zustand + hooks useT() / useLocale()
│       │   ├── en.ts          # Anglais (référence)
│       │   ├── fr.ts          # Français
│       │   ├── de.ts          # Allemand
│       │   ├── es.ts          # Espagnol
│       │   ├── ru.ts          # Russe
│       │   └── ja.ts          # Japonais
│       ├── store/             # État global Zustand
│       │   ├── blockStore.ts  # Liste de blocs, draft, sélection, viewer
│       │   └── configStore.ts # Configuration éditeur (dir, taille atlas, pack)
│       └── hooks/useApi.ts    # Hooks de chargement/mutation via l'API
│
├── package.json               # Scripts racine (monorepo npm workspaces)
└── SMToolConfig.json          # Chemin StarMade (créé au premier lancement, gitignored)
```

---

## Formes de blocs

Portées depuis StarOS BPViewer (`starmade_gl.js` par @Blackcancer) :

| BlockStyle | Forme | Description |
|---|---|---|
| 0 | **Cube** | Bloc standard — 6 quads, 3 modes UV (1/3/6 faces) |
| 1 | **Wedge** | Prisme triangulaire incliné |
| 2 | **Corner** | Coin en L, forme à 5 sommets |
| 3 | **Cross** | Deux plans croisés (flore, vignes) — DoubleSide |
| 4 | **Tetra** | Tétraèdre, 4 faces |
| 5 | **Penta** | Prisme pentagone (famille hepta) |
| 6 | **Hepta** | Rendu comme Cube |

---

## Atlas de textures

L'atlas composite regroupe les pages de textures StarMade en une grille 64×32 tuiles :

| Page | Fichier source | IDs de tuiles |
|---|---|---|
| 0 | `t000.png` | 0–255 |
| 1 | `t001.png` | 256–511 |
| 2 | `t002.png` | 512–767 |
| 3 | `t003.png` | 768–1023 |
| 4–6 | *(réservé)* | 1024–1791 |
| 7 | `custom.png` | 1792–2047 |

Les normal maps suivent la même structure avec le suffixe `_NRM`.

---

## Localisation

Le système i18n est basé sur Zustand avec persistance `localStorage`. La langue est détectée automatiquement depuis les préférences du navigateur au premier lancement.

**Ajouter une nouvelle langue :**
1. Créer `client/src/i18n/<code>.ts` en suivant la structure de `en.ts`
2. L'ajouter dans `LOCALES` dans `client/src/i18n/index.ts`
3. La langue apparaît automatiquement dans le sélecteur — aucune autre modification nécessaire

---

## WSL / Windows

Le serveur tourne sous WSL (Linux) mais StarMade peut être installé sur un lecteur Windows. Les chemins Windows (`D:\Games\StarMade`) sont automatiquement convertis en chemins WSL (`/mnt/d/Games/StarMade`) par `server/src/utils/path.ts`.

---

## Tests et qualité

```bash
npm test        # 121 tests — serveur + client
npm run coverage # Rapport de couverture
```

- **Couverture branches client :** 100%
- **TypeScript :** mode strict, 0 erreur
- **Toutes les fonctions pures** exportées et testées individuellement
