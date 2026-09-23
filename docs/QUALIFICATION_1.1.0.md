# Qualification de StarMade-BlockEditor 1.1.0

23 septembre 2026. Livraison de l’intégration StarMade-Decoder 2.0.0 et StarMade-3D 1.0.0, de l’export d’icônes, de l’interface mobile et des six langues.

## Résultat

**PASS sur le périmètre de l’éditeur décrit ci-dessous.** Le contrôle couvre tous les fichiers exécutables de `server/src` et `client/src`, y compris les points d’entrée. La dette de couverture constatée dans l’audit initial a été résorbée ; aucune exclusion de code de production ni directive d’ignore n’est utilisée.

| Contrôle | Résultat |
| --- | --- |
| Provenance des deux archives SDK et SHA-256 | PASS, `npm run vendor:check` |
| Documentation et types serveur/client | PASS, 46 sources |
| Tests serveur | 150 réussis |
| Tests client | 275 réussis |
| Tests du contrôle de couverture et des archives | 6 réussis |
| Couverture serveur | 846/846 lignes ; 700/700 branches |
| Couverture client | 1416/1416 lignes ; 933/933 branches |
| Seuil indépendant bloquant | 46 fichiers à 100 % lignes et branches ; aucun absent ou ignoré |
| Build de production | PASS, TypeScript et Vite |
| Installation propre `npm ci` | PASS avec Node 22 ; installation production séparée également réussie |
| `npm audit` | 0 vulnérabilité signalée dans le graphe verrouillé |
| Recette navigateur sur copie jetable | PASS, 11 contrôles, aucune erreur JavaScript |
| Rendu WebGL2 natif | PASS, 124 observations |
| Export PNG | PASS, 9 captures et comparaison aux icônes existantes |
| Aperçu public | PASS, accès anonyme sur HTTPS 8003, sans requête de mutation pendant la vérification |

Commandes exécutées : `npm run validate`, puis `npm run test:browser` avec `STARMADE_DIR=/srv/StarMade` et Chromium. La validation porte sur le code final, incluant le retour du focus et les dimensions des commandes tactiles. `npm run release:check` enchaîne ces deux contrôles pour une reproduction complète. Les rapports détaillés sont rassemblés dans `release/qualification-1.1.0/` et dans l’archive de livraison.

## Persistance et intégration

Le navigateur a chargé 1516 définitions. Les tests couvrent la conservation des attributs et extensions XML, les validations d’entrée, les écritures atomiques avec sauvegarde, le contrôle de révision et les réponses asynchrones obsolètes. La suppression d’une surcharge restitue le bloc vanilla. Les écritures de la recette utilisent exclusivement une copie jetable.

Empreinte de la source avant **et** après la recette : `331b3289f03b876f671155aeb913e6fdc6543fe96d13151b01b56d81e90673c7`. Le contrôle porte sur l’ensemble des répertoires sources copiés par le script, dont les configurations, shaders, modèles LOD, textures et icônes.

Contrôles de la recette finale :

- Chargement du catalogue et confinement à l’installation configurée.
- Recherche et sélection d’un bloc.
- Création, sauvegarde et rechargement avec conservation des sous-arbres XML.
- Refus d’une sauvegarde obsolète avec erreur visible et conservation du brouillon.
- Conservation du brouillon après rechargement, puis reprise explicite de la version serveur.
- Suppression d’une surcharge et réapparition immédiate de la définition vanilla.
- Import d’icône, sauvegarde de l’original et restauration exacte du slot.
- Génération native d’un bloc incliné, aperçu, application et restauration exacte.
- Persistance de la suppression d’un bloc personnalisé.
- Parcours mobile français : langue conservée, capture depuis Propriétés, édition et dialogues accessibles.
- Même parcours mobile en anglais, avec retour du focus vérifié.

## Rendu et icônes

La matrice native couvre les sept styles, 88 orientations, les slabs, les animations, les lumières, la transparence, les modèles LOD, les textures personnalisées et la perte/restauration du contexte graphique. Les shaders ont été compilés dans un vrai contexte WebGL2 Chromium/SwiftShader.

Les icônes sont des PNG transparents de 64 × 64 pixels, avec une caméra orthographique standardisée. Le cube de référence et le cube généré occupent les pixels 8 à 55 sur les deux axes. La comparaison contrôle trois zones de faces avec une tolérance maximale de 12 par canal RGB. Les captures couvrent aussi wedge, slab, LOD, verre et lumière active/inactive. L’export est indépendant de l’orbite interactive et restaure la caméra, les uniforms et les réglages du moteur.

Sur mobile, la capture avant la première visite de l’aperçu produit exactement le même PNG que sur ordinateur. Le rendu masqué ne calcule plus de frames ; il reprend et se redimensionne lors du retour à l’onglet Aperçu. La génération seule ne modifie aucun fichier : l’utilisateur doit appliquer l’icône, et peut ensuite restaurer le slot d’origine.

## Mobile et langues

Trois onglets jusqu’à 1024 pixels conservent le brouillon et les panneaux montés. Les dialogues natifs contiennent le focus et le restituent à leur fermeture. Les aides sont accessibles au toucher et au clavier. Les contrôles de navigation et d’en-tête atteignent au moins 44 pixels dans les six langues à 360 pixels de largeur.

Les recettes contrôlent le français et l’anglais à 390 × 844, la persistance de langue, l’édition/sauvegarde, les sélecteurs de textures/icônes et la génération depuis Propriétés. Le lien public a été vérifié à 360 × 800, 390 × 844, 768 × 1024, 844 × 390 et 1440 × 1000, sans débordement horizontal de page.

Chaque langue possède **396 entrées** : 363 textes et 33 fonctions de formatage, en français, anglais, allemand, espagnol, russe et japonais. Les tests vérifient la même structure, les paramètres, les pluriels, les diagnostics et les avertissements natifs. Les noms et descriptions issus des données du jeu ainsi que les identifiants XML restent des données du jeu ; les diagnostics inconnus restent consultables dans un panneau de détails techniques.

## Déploiement et limites vérifiées

Adresse directe : **https://initsysrev.net:8003/**, sans jeton ni connexion. Le service dédié utilise Node 22 et une copie indépendante du jeu ; le proxy HTTPS transmet vers le backend local sur 38475. La configuration et les données de cette copie sont conservées lors du remplacement du dossier de livraison.

Les recettes graphiques ont été exécutées avec Chromium sous Linux et SwiftShader, avec dimensions et interactions mobiles émulées. Aucun téléphone physique, Safari/iOS ou lancement du script Windows n’a été qualifié dans cet environnement. Aucun import ni redémarrage du jeu StarMade en cours d’exécution n’a été effectué. Les pourcentages ci-dessus qualifient l’éditeur ; ils ne prétendent pas mesurer à nouveau les suites internes complètes des deux SDK.

## Couverture exacte par fichier

| Fichier exécutable | Lignes | Branches |
| --- | ---: | ---: |
| `server/src/api/assets.ts` | 104/104 | 81/81 |
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
| `client/src/3d/geometries/index.ts` | 8/8 | 2/2 |
| `client/src/3d/nativePreview.ts` | 73/73 | 42/42 |
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
