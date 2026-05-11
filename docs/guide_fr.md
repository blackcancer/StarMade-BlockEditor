# StarMade Block Editor — Guide utilisateur

Ce guide explique le fonctionnement de StarMade Block Editor côté utilisateur : démarrage, configuration, navigation, édition des blocs, textures, icônes et sauvegarde.

---

## 1. Rôle de l'application

StarMade Block Editor est une application web locale qui permet d'éditer visuellement les définitions de blocs StarMade.

Elle contient deux parties :

- un **serveur** qui lit et écrit les fichiers StarMade ;
- une **interface navigateur** qui affiche la liste des blocs, la prévisualisation 3D, les sélecteurs de textures/icônes et le panneau de propriétés.

En mode production, tout est disponible à l'adresse :

```text
http://localhost:3847
```

L'application lit les blocs vanilla de StarMade, mais les modifications sont sauvegardées comme blocs/custom overrides afin d'éviter de modifier directement les fichiers originaux du jeu.

---

## 2. Démarrer l'application

### Windows

```bat
start.bat
```

### Linux / macOS / WSL

```bash
./start.sh
```

Le script de démarrage vérifie Node.js/npm, installe les dépendances si nécessaire, compile l'application si le dossier `dist` est absent, démarre le serveur et ouvre le navigateur.

Pour forcer une recompilation :

```bash
./start.sh --rebuild
```

```bat
start.bat --rebuild
```

---

## 3. Première configuration

Au premier lancement, indiquez le dossier d'installation de StarMade.

Exemples :

```text
D:\Jeux\Steam\steamapps\common\StarMade\
```

```text
/mnt/d/Jeux/Steam/steamapps/common/StarMade/
```

Le serveur valide le chemin en cherchant notamment :

```text
data/config/BlockConfig.xml
```

Sous WSL, les chemins Windows sont convertis automatiquement vers `/mnt/<lecteur>/...`.

La configuration locale est enregistrée dans :

```text
SMToolConfig.json
```

---

## 4. Interface principale

L'interface est organisée en trois colonnes :

```text
Sidebar | Viewer 3D | Propriétés
```

### Sidebar

La sidebar permet de :

- rechercher par nom, type XML ou ID ;
- afficher/masquer les blocs vanilla ;
- afficher/masquer les blocs custom ;
- afficher/masquer les blocs deprecated ;
- sélectionner le bloc à modifier.

### Viewer 3D

Le viewer affiche le bloc sélectionné avec la géométrie et le mapping atlas StarMade.

Vous pouvez :

- tourner, zoomer et déplacer la caméra ;
- changer l'orientation du bloc ;
- activer/désactiver l'état actif ;
- prévisualiser les lumières ;
- choisir la face à texturer.

### Panneau de propriétés

Le panneau de propriétés édite le brouillon du bloc sélectionné :

- identité, nom, description et icône ;
- points de vie, masse, volume, prix, armure ;
- forme, orientation, slab et variantes ;
- options de rendu et de texture ;
- flags gameplay/logique/shop/deprecated ;
- couleur et intensité de lumière ;
- propriétés avancées BlockConfig.

---

## 5. Workflow d'édition

1. Sélectionnez un bloc dans la sidebar.
2. Le bloc apparaît dans le viewer 3D.
3. Le panneau de propriétés crée un brouillon éditable.
4. Modifiez les champs, textures, icône ou propriétés avancées.
5. Sauvegardez.
6. Le serveur écrit les données custom et recharge le bloc modifié.

Important : modifier un bloc vanilla ne modifie pas directement le fichier vanilla de StarMade. La sauvegarde crée un override custom.

---

## 6. Sauvegarde et blocs custom

Lors d'une sauvegarde :

- un bloc vanilla devient un override custom ;
- un bloc déjà custom est mis à jour ;
- les propriétés XML inconnues sont préservées autant que possible ;
- l'interface indique que le bloc est custom.

Ce fonctionnement protège les fichiers originaux du jeu.

---

## 7. Créer un nouveau bloc

Utilisez le bouton **Nouveau bloc** dans l'en-tête.

L'application crée un bloc custom avec des valeurs par défaut, le sélectionne et l'ouvre dans l'éditeur. Vous pouvez ensuite modifier ses statistiques, textures, icône et propriétés avancées.

---

## 8. Modifier les textures

### Sélecteur de faces

Sous le viewer 3D, le sélecteur de faces dépend de `IndividualSides` :

- **1 côté** : toutes les faces partagent la même texture ;
- **3 côtés** : groupes front/back, top/bottom, left/right ;
- **6 côtés** : chaque face possède sa texture.

Cliquez une face pour ouvrir l'atlas.

### Atlas

L'atlas affiche les tuiles StarMade. Cliquer une tuile assigne son ID à la face sélectionnée.

| Page | Source | IDs |
|---|---|---|
| 0 | `t000.png` | `0–255` |
| 1 | `t001.png` | `256–511` |
| 2 | `t002.png` | `512–767` |
| 3 | `t003.png` | `768–1023` |
| 4–6 | réservé | `1024–1791` |
| 7 | `custom.png` | `1792–2047` |

### Gestionnaire d'atlas custom

Il permet :

- d'importer un atlas custom complet ;
- de remplacer une tuile custom ;
- de choisir diffuse ou normal map.

Après import, les caches atlas sont rafraîchis.

---

## 9. Modifier les icônes

Ouvrez le sélecteur d'icône depuis le panneau de propriétés.

Le sélecteur affiche les feuilles d'icônes StarMade et écrit l'ID numérique de l'icône dans le brouillon du bloc.

---

## 10. Formes et règles de rendu

| BlockStyle | Forme |
|---|---|
| 0 | Cube |
| 1 | Wedge |
| 2 | Corner |
| 3 | Cross |
| 4 | Tetra |
| 5 | Penta |
| 6 | Hepta / fallback cube |

Règles importantes :

- les blocs Cross utilisent l'alpha de texture même si `Transparency` est désactivé ;
- les textures animées avancent sur des tuiles consécutives ;
- les textures d'activation utilisent la tuile voisine selon les règles StarMade ;
- les slabs changent l'épaisseur dans la preview ;
- l'orientation fait tourner les formes asymétriques.

---

## 11. Lumières

Les blocs avec `LightSource` peuvent être prévisualisés avec une lumière active.

`LightSourceColor` utilise :

```text
[r, g, b, intensity]
```

Les trois premières valeurs sont la couleur, la quatrième est l'intensité.

---

## 12. Propriétés avancées

BlockConfig contient de nombreuses propriétés spécialisées : ressources, recettes, factories, chambers, controllers, collision, LOD, logique et gameplay.

L'éditeur avancé fournit des contrôles structurés pour les cas fréquents et conserve les champs inconnus pour éviter les pertes de données.

Si vous ne connaissez pas une propriété avancée, laissez-la inchangée.

---

## 13. Langue

Le sélecteur de langue dans l'en-tête change les libellés et aides de l'interface. Il ne modifie pas les données StarMade sauvegardées.

Langues disponibles : anglais, français, allemand, espagnol, russe et japonais.

---

## 14. Workflow recommandé

1. Faites une sauvegarde de vos fichiers custom StarMade.
2. Lancez l'éditeur.
3. Modifiez un bloc à la fois.
4. Sauvegardez.
5. Rechargez l'application pour vérifier la persistance.
6. Testez dans StarMade si le changement affecte le gameplay.

---

## 15. Dépannage

### Le dossier StarMade est invalide

Vérifiez que le dossier contient ou mène vers :

```text
data/config/BlockConfig.xml
```

### Les textures ne se mettent pas à jour

Essayez de rouvrir l'atlas, d'utiliser le bouton de rechargement des textures ou de redémarrer l'application.

### Le navigateur ne s'ouvre pas

Ouvrez manuellement :

```text
http://localhost:3847
```

### Le build échoue

```bash
npm install
npm run build
```

Puis relancez avec `--rebuild`.

---

## 16. Mainteneurs

Commandes utiles :

```bash
npm run docs:check
npm test
npm run build
```

Documentation technique :

```text
docs/CODEBASE_DOCUMENTATION.md
```
