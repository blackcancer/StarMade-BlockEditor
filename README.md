# StarMade Block Editor 1.1

Éditeur de blocs StarMade avec **StarMade-Decoder 2.0.0** pour les définitions et **StarMade-3D 1.0.0** pour le rendu natif. L’interface existe en français, anglais, allemand, espagnol, russe et japonais.

Les six langues possèdent les mêmes 396 entrées vérifiées, y compris les messages d’erreur, les avertissements du rendu et les commandes mobiles.

## Démarrer

Prérequis : **Node.js 22.16 ou supérieur**, npm, un navigateur WebGL2 et une installation locale de StarMade contenant ses shaders et textures.

```bash
npm ci
npm run build
npm start
```

Ouvrir `http://localhost:3847`. Les scripts `./start.sh` et `start.bat` installent les dépendances manquantes, compilent et ouvrent cette adresse. Utiliser `--rebuild` après une mise à jour. Pour choisir un autre port local :

```bash
PORT=8003 ./start.sh --rebuild
```

Sous Windows : `set PORT=8003`, puis `start.bat --rebuild`. Le serveur écoute sur l’interface locale. Les réglages sont conservés dans `SMToolConfig.json`, dans le répertoire de lancement.

L’installation doit contenir `data/config/BlockConfig.xml` et `BlockTypes.properties`. Les fichiers personnalisés ne sont pas nécessaires au premier démarrage. Les chemins Windows sont reconnus sous WSL.

## Téléphone et tablette

Sur les écrans étroits, les onglets **Blocs**, **Aperçu** et **Propriétés** donnent accès aux trois panneaux. Le brouillon reste conservé lors du passage d’un panneau à l’autre. L’aperçu se manipule au toucher et les réglages restent accessibles dans l’en-tête. Les sélecteurs d’images défilent dans leur propre fenêtre.

## Édition et sauvegarde

Les définitions vanilla restent intactes : **Save to Custom** crée ou met à jour une surcharge dans `customBlockConfig`. Supprimer cette surcharge réaffiche immédiatement la définition vanilla. StarMade-Decoder conserve les attributs et structures XML inconnus lors des modifications de champs connus.

Chaque écriture conserve une sauvegarde des octets précédents (`.backup-*`) et remplace le fichier par renommage d’un temporaire local. Une révision du catalogue protège contre les modifications concurrentes. En cas de conflit, le brouillon reste disponible : noter les valeurs à conserver, recharger le catalogue, puis **Revert** pour reprendre la dernière définition avant de réappliquer ses changements. Le changement de bloc ou d’installation et la fermeture de la page protègent les brouillons non enregistrés.

L’import d’une texture ou d’une icône écrit immédiatement une image, indépendamment de la sauvegarde de la définition du bloc. Une icône peut être partagée par plusieurs blocs. **Restore original icon** restaure uniquement le slot concerné depuis sa sauvegarde d’origine.

## Rendu et création d’icônes

Le rendu utilise les géométries, orientations, shaders, éclairages et modèles LOD natifs de StarMade-3D. Le style 6 correspond à **Normal, 24 orientations**. Les modes actif/inactif, les épaisseurs, les textures animées et les normal maps suivent les données natives. L’éditeur charge ses ressources depuis l’installation choisie ; les ressources propriétaires du jeu ne sont pas distribuées.

Dans les propriétés du bloc, **Créer depuis le bloc** produit un aperçu PNG transparent de **64 × 64 pixels**. La caméra orthographique reprend l’angle et les marges des icônes de cubes existantes : cube centré sur une empreinte de 48 × 48 pixels. L’orientation et l’état actif choisis dans le visualiseur sont conservés ; la grille et la surbrillance de sélection sont absentes de l’image. **Appliquer l’icône** écrit le slot affiché. **Annuler** abandonne l’aperçu. La vue interactive est restaurée après l’export.

Le sélecteur de textures présente 8 pages de 256 tuiles : pages 0–3 vanilla, pages 4–6 réservées, page 7 personnalisée (IDs 1792–2047). Les couches natives sont chargées séparément pour la 3D. Les normal maps TGA conservent leurs canaux de matériau ; un fichier personnalisé RGB sans canal alpha reçoit un alpha nul, avec un avertissement dans l’aperçu.

## Développement et qualification

```bash
npm run dev             # Vite :5174, API locale :3847
npm run validate        # provenance, documentation, types, tests, couverture et build
npm audit               # dépendances directes et transitives
```

La couverture bloque la livraison si **un seul fichier exécutable** de `client/src` ou `server/src` n’atteint pas exactement **100 % des lignes et branches**. Les points d’entrée sont inclus. Le contrôle indépendant refuse les directives d’exclusion et les fichiers absents des rapports. Les rapports HTML et JSON se trouvent dans `client/coverage` et `server/coverage`.

La recette de livraison utilise une **copie temporaire** des données du jeu, vérifie le navigateur et les sauvegardes, puis contrôle que la source reste inchangée :

```bash
STARMADE_DIR=/chemin/StarMade CHROMIUM_PATH=/chemin/chromium npm run release:check
```

Une installation absente fait échouer cette recette ; elle ne produit pas de validation partielle présentée comme complète. Les shaders sont compilés dans un vrai contexte WebGL2. Le rendu a également été qualifié avec Chromium/SwiftShader ; les performances sur GPU matériel dépendent du poste utilisé.

## Dépendances StarMade

Les SDK ne sont pas publiés sur le registre npm public. Les archives vérifiées sont donc livrées dans `vendor/`, sans lien symbolique vers un dépôt voisin. `vendor/manifest.json` conserve versions, commits source et empreintes SHA-256 ; `npm run vendor:check` vérifie les archives. Le fichier de verrouillage permet une installation reproductible avec `npm ci`.

- StarMade-Decoder : commit `4cb21bd72258c87eb8115f90449a8334c34658a6` (2.0.0).
- StarMade-3D : commit `bb80c2ebaccf262e944925a807671e67e4e15ac5` (1.0.0).

## Aperçu distant

Un proxy HTTPS peut publier le serveur local. `EDITOR_PUBLIC_ORIGIN` définit l’origine autorisée et `EDITOR_FIXED_STARMADE_DIR` restreint l’éditeur à sa copie de test. L’aperçu demandé est accessible directement sur **https://initsysrev.net:8003/**, sans jeton ni connexion. Le proxy préserve le Host. Voir [la configuration d’aperçu](docs/PREVIEW_DEPLOYMENT.md).

Les résultats et limites de la livraison figurent dans le [rapport de qualification 1.1.0](docs/QUALIFICATION_1.1.0.md). L’audit initial est conservé dans [AUDIT_INTEGRATION_2026-09-23.md](docs/AUDIT_INTEGRATION_2026-09-23.md). Les guides historiques décrivent l’interface 1.0 ; les comportements de sauvegarde, de rendu et d’export de cette page font référence pour la version 1.1.
