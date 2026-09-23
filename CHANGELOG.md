# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).
Ce projet suit le [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [1.1.0] — 2026-09-23

- Intégration de StarMade-Decoder 2.0.0 et StarMade-3D 1.0.0, archives locales vérifiées et verrouillées.
- Rendu natif des sept styles, orientations, slabs, animations, lumières, transparence et modèles LOD activables.
- Génération d’icônes PNG de 64 × 64 pixels en vue orthographique, cadrées sur les cubes existants, avec aperçu avant application et restauration du slot original.
- Interface mobile et tablette à trois onglets, commandes tactiles, dialogues accessibles et brouillons conservés lors de la navigation.
- Traductions complétées dans les six langues, y compris les messages d’erreur, les avertissements du rendu et les propriétés avancées.
- Correction de l’en-tête PC : listes déroulantes et boutons alignés, espacement explicite et hauteur adaptée aux fenêtres plus étroites.
- Retour du focus au bouton d’ouverture après fermeture des sélecteurs d’icônes et de textures ; rendu 3D suspendu lorsqu’il est masqué sur mobile.
- Conservation des attributs/XML inconnus, sauvegardes atomiques avec backups, ETag obligatoire et refus des écritures concurrentes obsolètes.
- Protection des brouillons et des réponses asynchrones, erreurs explicites et restrictions de l’aperçu distant à une copie de jeu.
- Node.js 22.16+, dépendances actualisées, couverture bloquante à 100 % des lignes et branches par fichier, recette navigateur sur copie isolée.
- Qualification : 425 tests applicatifs et 6 tests d’outillage réussis ; recettes navigateur d’édition, de rendu natif, d’export et de mise en page PC/mobile. Voir les rapports de qualification et du correctif d’en-tête dans `docs/`.

## [1.0.0] — 2026-05-11

Première version stable du StarMade Block Editor.

### Ajouté

#### Interface 3D
- Prévisualisation 3D temps réel des 6 formes de blocs StarMade (Cube, Wedge, Corner, Cross, Tetra, Penta)
- Mappage UV par face depuis l'atlas de textures StarMade (64×32 tuiles, 8 pages)
- OrbitControls (rotation, zoom) avec damping
- Grille de référence et sol d'aperçu
- Support des normal maps (convention Y inversée pour StarMade)
- Prévisualisation lumière active/inactive (`LightSource`, `HasActivationTexture`)
- Footprint radial de lumière pour évaluer la portée d'émission
- Aperçu des slab verticaux (3/4, 1/2, 1/4)
- Cycle d'animation de textures (4 tuiles × 0,5 s)

#### Éditeur de propriétés
- Tous les champs `BlockConfig.xml` exposés : HP, masse, volume, prix, armure, flags
- Éditeur de couleur de lumière (picker + saisie hex + curseur intensité + palette)
- Armure par type de dommage (Heat, Kinetic, EM)
- Sélecteurs de variantes (slabIds, styleIds)
- 60+ propriétés avancées structurées en sous-éditeurs dédiés :
  - Ressources / Recettes (Consistence, InRecipe, RecipeBuyResource…)
  - Usine / Production (ProducedInFactory, FactoryBakeTime…)
  - Chambres réacteur (arbre d'amélioration, capacité, groupes…)
  - Contrôleurs (ControlledBy, Controlling, combinaisons…)
  - Collision / Physique (formes None / BlockType / ConvexHull)
  - LOD / Maillage (LodShape, activation animation style)
  - Logique / Gameplay (SensorInput, Beacon, ResourceInjection…)
  - Réacteur / Structure, Inventaire / Métadonnées, Autres

#### Sélecteur de faces et atlas
- 6 boutons de face avec mise en évidence dans le viewer 3D
- Respect des modes `IndividualSides` (1 / 3 / 6 faces)
- Sélecteur d'atlas interactif (picker mode + manager mode)
- Import d'atlas personnalisé complet (diffuse + normal)
- Remplacement d'un tuyau individuel dans la zone custom (page 7, tuiles 1792–2047)
- Sélecteur d'icônes de construction (6 feuilles × 256 slots)
- Import d'icônes personnalisées

#### Données et API
- Lecture de 1 500+ blocs vanilla depuis `BlockConfig.xml`
- Résolution des IDs via `BlockTypes.properties`
- Écriture uniquement dans `customBlockConfig/BlockConfigImport.xml`
- Système de draft (édition sans sauvegarde immédiate) avec tracking dirty
- Promotion automatique des blocs vanilla en custom à la première sauvegarde
- Cache serveur invalidé par mtime des fichiers XML
- Endpoints RESTful : `GET/PUT/POST/DELETE /api/blocks`, `/api/config`, `/api/textures`
- Support WSL : conversion automatique des chemins Windows ↔ WSL

#### Localisation
- Système i18n basé sur Zustand avec persistance localStorage
- Détection automatique de la langue du navigateur
- Sélecteur de langue dans le header
- **6 langues complètes** : Anglais, Français, Allemand, Espagnol, Russe, Japonais
- 370+ chaînes par locale, incluant tooltips StarMade détaillés

#### Qualité
- TypeScript strict — 0 erreur sur l'ensemble du projet
- 121 tests (20 fichiers de test — client + serveur)
- 100% de couverture des branches (client)
- Documentation JSDoc exhaustive : chaque fichier, fonction, type et constante
- Sources annotées : `ElementInformation.java`, `starmade_gl.js`, `Occlusion.java`

#### Build de production
- Code splitting Vite : vendor-three / vendor-r3f / vendor-react / vendor-zustand
- Serveur Express en mode production sert le client statique + l'API sur un seul port
- Variable d'environnement `PORT` pour le déploiement flexible
- Script `npm run preview` pour tester le build de production en local

---

## [0.x] — Historique de développement

| Commit | Description |
|---|---|
| `3942981` | feat: amélioration textures et éclairage du preview bloc |
| `67ab96e` | feat: prévisualisation slab + champs armure d'effets |
| `ce0ffdd` | feat: propriétés brutes et slabs verticaux |
| `70a268e` | feat: structure UI des propriétés supplémentaires |
| `af0570a` | feat: amélioration UI du panneau de propriétés |
| `4e81196` | feat: éditeur de ressources/recettes ergonomique |
| `16d9d82` | feat: éditeurs de propriétés avancées ergonomiques |
| `bd7deb2` | chore: simplification des labels dropdown |
| `301bf01` | chore: masquage des IDs techniques dans l'UI |
| `9e5ef1f` | chore: suppression des labels techniques restants |
| `b4e65dd` | docs: amélioration des tooltips de propriétés de blocs |
| `c4f6b10` | feat: centralisation des imports d'atlas personnalisés |
| `0810f4a` | refactor: découpage du panneau de propriétés |
| `4819b16` | refactor: extraction des composants de contrôle |
| `b8a52e7` | refactor: extraction des éditeurs de propriétés avancées |
| `44134fe` | test: couverture unitaire des helpers principaux |
| `201eb92` | test: expansion couverture UI et configuration |
| `ee26012` | test: augmentation couverture client |
| `353ce85` | docs: documentation exhaustive du codebase |
| `c776753` | feat: système i18n EN + FR |
| `dcc1e23` | feat: localisation DE + ES |
| `3ad7b8e` | feat: localisation RU + JA |
