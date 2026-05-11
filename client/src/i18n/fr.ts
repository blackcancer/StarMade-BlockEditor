/**
 * @fileoverview French (fr) locale strings.
 *
 * Traduction française complète de l'interface du StarMade Block Editor.
 * Toutes les clés doivent correspondre exactement à la structure de en.ts.
 *
 * @module i18n/fr
 */

import type { Translations } from './en.js';

const fr: Translations = {

  // ── App shell ──────────────────────────────────────────────────────────────
  app: {
    title:    '⚙ StarMade Block Editor',
    subtitle: 'v1.0.0',
    dirValid:   (name: string) => `✓ ${name}`,
    dirInvalid: '⚠ Aucun répertoire StarMade configuré',
    blockCount: (n: number) => `${n} bloc${n === 1 ? '' : 's'}`,
    reloadTooltip:   'Recharger les blocs depuis le disque',
    newBlockTooltip: 'Créer un nouveau bloc personnalisé',
    reload:   '↺ Recharger',
    newBlock: '+ Nouveau bloc',
    textureResolution: 'Résolution des textures',
    texturePack:       'Pack de textures',
    language: 'Langue',
  },

  // ── Config dialog ──────────────────────────────────────────────────────────
  config: {
    title:       '⚙ StarMade Block Editor',
    description: 'Définissez le chemin vers votre répertoire d\'installation StarMade pour commencer.',
    placeholder: 'ex. D:/Games/StarMade/StarMade',
    save:        'Enregistrer & Charger les blocs',
  },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    searchPlaceholder: '🔍 Rechercher un bloc…',
    filterVanilla:    (n: number) => `Vanilla (${n})`,
    filterCustom:     (n: number) => `Personnalisé (${n})`,
    filterDeprecated: 'Obsolètes',
    loading: 'Chargement des blocs…',
    empty:   'Aucun bloc ne correspond à la recherche.',
    footer:  (vanilla: number, custom: number) => `Vanilla : ${vanilla} · Personnalisés : ${custom}`,
  },

  // ── Viewer column ──────────────────────────────────────────────────────────
  viewer: {
    emptyHint: 'Sélectionnez un bloc dans la liste pour le prévisualiser.',
    styleBadge: (name: string, index: number) => `${name} (style ${index})`,
    orientation: 'Orientation',
    orientOption: (i: number) => `Orient. ${i}`,
    prevOrientation: 'Orientation précédente',
    nextOrientation: 'Orientation suivante',
    activationTexturePreview: 'Aperçu texture d\'activation',
    lightPreview:  'Aperçu lumière',
    previewOn:  'ON',
    previewOff: 'OFF',
    toggle: 'Basculer',
    activePreviewTooltip:
      'Affiché uniquement pour LightSource ou HasActivationTexture. CanActivate seul n\'a pas de state texture.',
  },

  // ── Face selector ──────────────────────────────────────────────────────────
  faceSelector: {
    label:           'Faces de texture',
    manageatlas:     'Gérer l\'atlas personnalisé…',
    hint:            'Cliquez sur une face pour changer sa tuile de texture.',
    hintAllSame:     ' (Toutes les faces partagent la même tuile)',
    hintGrouped:     ' (3 groupes : avant/arrière · haut/bas · côtés)',
    hintIndependent: ' (6 faces indépendantes)',
    hintActivation:  ' L\'aperçu inactif utilise la tuile immédiatement à droite (+1), comme le chemin de texture d\'état actif du moteur.',
    hintAnimated:    ' L\'aperçu animé cycle sur 4 tuiles toutes les 0,5 s.',
  },

  // ── Atlas picker ───────────────────────────────────────────────────────────
  atlasPicker: {
    titlePick:    'Choisir une texture',
    titleManager: 'Gestionnaire d\'atlas personnalisé',
    close:        '✕',
    hintPick:     'Cliquez sur une tuile pour la sélectionner · Échap pour fermer',
    importAtlasDesc: (px: number, cols: number, rows: number) =>
      `Importer un atlas StarMade complet : ${px}×${px} px (${cols}×${rows} tuiles)`,
    mapDiffuse: 'Atlas diffus',
    mapNormal:  'Atlas normal',
    importFull: 'Importer l\'atlas complet…',
    importing:  'Importation…',
    advancedSummary: 'Avancé : remplacer une tuile',
    slotLabel:  'Emplacement',
    replaceTile: 'Remplacer la tuile sélectionnée…',
    errorImportAtlas: (e: unknown) => `Échec de l\'importation de l\'atlas : ${e}`,
    errorImportTile:  (e: unknown) => `Échec de l\'importation de la tuile : ${e}`,
  },

  // ── Icon picker ────────────────────────────────────────────────────────────
  iconPicker: {
    title: 'Icônes de construction',
    close: '✕',
    hint:  'Cliquez sur une icône pour la sélectionner · Échap pour fermer',
  },

  // ── Properties panel — general ─────────────────────────────────────────────
  properties: {
    empty: 'Sélectionnez un bloc pour modifier ses propriétés.',
    subtitleCustom:  'Bloc personnalisé',
    subtitleVanilla: 'Bloc vanilla',
    vanillaNotice:
      '⚠ Bloc vanilla — les modifications seront enregistrées dans customBlockConfig/BlockConfigImport.xml.',
    badgeCustom:     'Personnalisé',
    badgeDeprecated: 'Obsolète',
    save:   '💾 Enregistrer (personnalisé)',
    revert: '↩ Annuler',
    delete: '🗑 Supprimer',
    deleteTooltip: (name: string) =>
      `Supprimer ce bloc de customBlockConfig/BlockConfigImport.xml`,
    deleteConfirm: (name: string) => `Supprimer le bloc personnalisé ${name} ?`,
    importIcon:    'Importer…',
    importingIcon: 'Importation…',
    pickIcon:      'Choisir…',
    pickIconTooltip: 'Choisir l\'icône de construction',
    errorImportIcon: (e: unknown) => `Échec de l\'importation de l\'icône : ${e}`,
  },

  // ── Properties panel — section headings ────────────────────────────────────
  section: {
    identity:   'Identité',
    stats:      'Statistiques',
    shape:      'Forme',
    rendering:  'Rendu / Texture',
    extra:      'Propriétés BlockConfig supplémentaires',
    flags:      'Indicateurs',
    lightColor: 'Couleur de lumière',
    variants:   'Variantes',
  },

  // ── Properties panel — field labels & tooltips ─────────────────────────────
  field: {
    name:        { label: 'Nom',           tooltip: 'Nom affiché par StarMade dans les inventaires, l\'interface boutique/construction et les listes de blocs.' },
    icon:        { label: 'Icône',         tooltip: 'Icône du menu de construction. StarMade les stocke dans des feuilles d\'icônes ; ce sélecteur écrit l\'emplacement correct pour les icônes personnalisées.' },
    description: { label: 'Description',   tooltip: 'Texte de description affiché aux joueurs dans les infobulles StarMade.' },
    hp:          { label: 'PV',            tooltip: 'Points de vie utilisés par le code de dommages/destruction. Des valeurs plus élevées rendent le bloc plus résistant.' },
    mass:        { label: 'Masse',         tooltip: 'Contribution en masse d\'un bloc. Utilisée pour la masse du vaisseau/station et affecte le mouvement et la maniabilité.' },
    volume:      { label: 'Volume',        tooltip: 'Valeur de volume utilisée par les systèmes d\'équilibre et de statistiques pour ce type de bloc.' },
    price:       { label: 'Prix',          tooltip: 'Prix de base en boutique/économie lorsque le bloc est disponible à l\'achat.' },
    armor:       { label: 'Valeur d\'armure', tooltip: 'Facteur d\'armure/résistance général utilisé par les calculs de dommages StarMade.' },
    effectArmor: { label: 'Armure par effet',tooltip: 'Modificateurs d\'armure par type de dommage. La source expose les résistances Chaleur, Cinétique et EM via EffectArmor.' },
    blockStyle:  { label: 'Style de bloc', tooltip: 'Forme du maillage sélectionnée par BlockStyle : cube, coin, angle, croix, tétra, penta, etc.' },
    slab:        { label: 'Géométrie dalle',tooltip: 'Épaisseur de dalle verticale utilisée par le moteur : bloc entier, 3/4, 1/2 ou 1/4 de bloc.' },
    individualSides: { label: 'Mode faces de texture', tooltip: 'Comment les identifiants de texture sont interprétés : une texture pour toutes les faces, faces groupées ou six faces indépendantes.' },
    computerRef: { label: 'Référence ordinateur', tooltip: 'Bloc contrôleur/ordinateur lié facultatif, utilisé par les blocs système qui référencent un bloc de contrôle.' },
    lodShapeFromFar: { label: 'Modèle LOD distant', tooltip: 'Maillage LOD utilisé à distance. StarMade bascule vers cette représentation basse résolution lors du rendu de blocs éloignés.' },
    lightColor:  { label: 'Couleur',       tooltip: 'Couleur RGB émise par une source lumineuse active. StarMade la lit en RVB direct, pas en HSL.' },
    lightRGBI:   { label: 'R V B Intensité', tooltip: 'Valeurs de LightSourceColor. RGB sont les canaux de couleur ; la quatrième valeur est le multiplicateur d\'intensité W utilisé par l\'éclairage du moteur.' },
    slabIds:     { label: 'Variantes de dalle',  tooltip: 'Liens vers les variantes de dalle de ce bloc. StarMade utilise ces associations pour naviguer entre les formes de dalle apparentées.' },
    styleIds:    { label: 'Variantes de style', tooltip: 'Liens vers les variantes de style/forme alternatives associées à ce bloc.' },
    emissiveIntensity: 'Intensité émissive',
  },

  // ── Properties panel — flags ────────────────────────────────────────────────
  flag: {
    sideTexturesPointToOrientation: { label: 'Textures suivent l\'orientation', tooltip: 'Fait pivoter la recherche de texture latérale avec l\'orientation du bloc. Utilisé par les blocs orientés/rail pour que les faces conservent la texture attendue après rotation.' },
    hasActivationTexture:           { label: 'Texture d\'activation',           tooltip: 'Active le changement de texture actif/inactif. En source, l\'état inactif utilise la tuile immédiatement à droite de la texture de base.' },
    extendedTexture4x4:             { label: 'Texture étendue 4×4',             tooltip: 'Utilise une empreinte de texture 4×4 étendue au lieu d\'une seule tuile pour les blocs nécessitant de plus grandes zones de texture.' },
    onlyDrawnInBuildMode:           { label: 'Mode construction uniquement',    tooltip: 'Rendu uniquement dans les contextes de construction/édition ; utilisé pour les blocs d\'aide/prévisualisation qui ne doivent pas être rendus normalement.' },
    isPlacable:     { label: 'Plaçable',          tooltip: 'Indique si le bloc peut être placé par les joueurs.' },
    inShop:         { label: 'En boutique',       tooltip: 'Indique si le bloc est vendu dans les boutiques.' },
    hasOrientation: { label: 'A une orientation', tooltip: 'Indique si le bloc mémorise l\'orientation de placement.' },
    canActivate:    { label: 'Peut s\'activer',   tooltip: 'Indique si le bloc peut être activé/désactivé par les joueurs (interaction de jeu, n\'affecte pas la texture).' },
    isDeprecated:   { label: 'Obsolète',          tooltip: 'Marque le bloc comme obsolète pour les systèmes de jeu/interface tout en préservant la compatibilité XML.' },
    lightSource:    { label: 'Source lumineuse',  tooltip: 'Indique si le bloc émet de la lumière lorsqu\'il est actif.' },
    transparency:   { label: 'Transparence',      tooltip: 'Active le rendu transparent/mixte.' },
    door:           { label: 'Porte',             tooltip: 'Indicateur de comportement de type porte utilisé par les systèmes d\'ouverture/fermeture.' },
    logicBlock:     { label: 'Bloc logique',      tooltip: 'Indique si le bloc participe au réseau logique.' },
    animated:       { label: 'Animé',             tooltip: 'Si vrai, la texture du bloc cycle sur une plage de 4 tuiles toutes les ~0,5 s.' },
  },

  // ── Variant selector ────────────────────────────────────────────────────────
  variant: {
    add:     '+ Ajouter une variante…',
    none:    'Aucune variante',
    remove:  '× (supprimer)',
    unknown: 'Bloc inconnu',
  },

  // ── Advanced properties editor ─────────────────────────────────────────────
  advanced: {
    searchPlaceholder: (n: number) => `Rechercher parmi ${n} propriété${n === 1 ? '' : 's'}…`,
    clear:        'Effacer',
    noProperties: 'Aucune propriété BlockConfig supplémentaire.',
    noMatch:      (q: string) => `Aucune propriété ne correspond à « ${q} ».`,

    recipeTitle:    'Participation aux recettes',
    recipeDesc:     'Contrôle si StarMade inclut ce bloc dans les systèmes de recettes et de production. Les blocs désactivés conservent leurs données mais sont ignorés par les recettes.',
    inRecipe:       'Dans les recettes',
    recipeInactive: 'Les champs de recette sont inactifs car InRecipe est à false.',
    resourceCategory: 'Catégorie de ressource',
    buyResources:     'Ressources d\'achat',
    addBuyResource:   '+ Ajouter une ressource d\'achat',
    materialReqs:     'Matériaux requis',
    addMaterial:      '+ Ajouter un matériau',
    cubatomTitle:     'Consistance cubatom',
    cubatomSpec:      'spécialisé',
    addCubatom:       '+ Ajouter un matériau cubatom',
    noResources:      'Aucune ressource.',

    producedIn:       'Produit dans',
    basicFactory:     'Usine de ressources de base',
    bakeTime:         'Temps de fabrication',
    factorySlot:      'Emplacement usine',
    factoryNone:      'Aucun',
    factoryInput:     'Entrée',
    factoryOutput:    'Sortie',

    generalChamber:   'Chambre générale',
    capacity:         'Capacité',
    rootChamber:      'Chambre racine',
    parentChamber:    'Chambre parente',
    upgradesTo:       'Améliore vers',
    permission:       'Permission',
    configGroups:     'Groupes de configuration',
    addGroup:         '+ Ajouter un groupe',

    controlledBy:    'Contrôlé par',
    controls:        'Contrôle',
    addControlledBy: '+ Ajouter un contrôleur',
    addControls:     '+ Ajouter un bloc contrôlé',

    defaultCollision:   'Collision par défaut',
    astronautCollision: 'Collision astronaute',
    collisionTooltip:   'Forme de collision. Le type bloc utilise un style de bloc nommé avec une épaisseur de dalle ; la coque convexe utilise une ressource de maillage nommée.',
    collisionNone:      'Aucune',
    collisionBlockType: 'Style de bloc',
    collisionConvex:    'Coque convexe',
    collisionMeshPlaceholder: 'Nom du maillage de collision',

    defaultLod:  'Modèle LOD par défaut',
    activeLod:   'Modèle LOD actif',
    activationLodBehavior: 'Comportement LOD d\'activation',

    resourceInjection:   'Injection de ressources',
    explosionAbsorption: 'Absorption d\'explosion',
  },

  // ── Property option labels ─────────────────────────────────────────────────
  options: {
    indSides: {
      allSame:     'Toutes les faces — même tuile',
      grouped:     'Faces groupées : avant/arrière · haut/bas · côtés',
      independent: 'Chaque face indépendante',
    },
    slab: {
      full: 'Bloc entier',
      s34:  'Dalle 3/4',
      s12:  'Dalle 1/2',
      s14:  'Dalle 1/4',
    },
    resourceType: {
      ore:          'Minerai',
      plant:        'Plante',
      basicResource:'Ressource de base',
      cubatom:      'Divisible en cubatom',
      manufactory:  'Manufacture',
      advanced:     'Avancé',
      capsule:      'Capsule',
    },
    factory: {
      none:             'Aucune',
      capsuleRefinery:  'Raffinerie de capsules',
      microAssembler:   'Micro-assembleur',
      componentFactory: 'Usine de composants',
      blockAssembler:   'Assembleur de blocs',
      chemicalFactory:  'Usine chimique',
    },
    resourceInjection: {
      off:   'Désactivé',
      ore:   'Minerai / ressource de terrain',
      flora: 'Ressource florale',
    },
    lodAnimation: {
      noSwitch:  'Pas de changement LOD actif',
      useActive: 'Utiliser le LOD actif lorsqu\'actif',
    },
  },

  // ── Geometry / block style names ───────────────────────────────────────────
  blockStyle: {
    cube:   'Cube',
    wedge:  'Coin',
    corner: 'Angle',
    cross:  'Croix',
    tetra:  'Tétra',
    penta:  'Penta',
    hepta:  'Hepta',
    style:  (n: number) => `Style ${n}`,
  },

  // ── Extra property tooltips ────────────────────────────────────────────────
  extraTooltip: {
    Consistence:     'Matériaux requis pour la fabrication. StarMade lit les entrées Item avec un compteur et un type de bloc/ressource.',
    CubatomConsistence: 'Liste de matériaux spéciaux utilisée par la logique de division cubatom/capsule. Généralement vide pour les blocs standard.',
    InRecipe:        'Contrôle si StarMade inclut ce bloc dans les systèmes de recettes/production.',
    RecipeBuyResource:'Ressources supplémentaires consommées par les recettes d\'achat/fabrication.',
    BlockResourceType:'Catégorie économique/ressource utilisée pour regrouper minerais, plantes, ressources de base, sorties de manufacture, pièces avancées et capsules.',
    ProducedInFactory:'Palier/catégorie d\'usine pouvant produire ce bloc.',
    BasicResourceFactory:'Bloc usine/ressource associé à la production de ressources de base.',
    FactoryBakeTime: 'Temps de production (en ticks de jeu) utilisé par la chaîne de fabrication.',
    Factory:         'Marque le rôle d\'emplacement usine pour ce bloc — généralement ENTRÉE (emplacement ressource) ou SORTIE (emplacement produit).',
    GeneralChamber:  'Marque une chambre de réacteur comme chambre générale/racine dans le système de réacteur.',
    ChamberCapacity: 'Contribution de capacité fournie au réacteur par cette chambre.',
    ChamberRoot:     'Chambre racine à laquelle cette chambre appartient dans l\'arbre d\'amélioration.',
    ChamberParent:   'Chambre parente requise avant l\'installation de celle-ci.',
    ChamberUpgradesTo:'Chambre disponible une fois cette chambre installée.',
    ChamberPermission:'Indicateur de niveau de permission/accès pour le système de chambre.',
    ChamberAppliesTo:'Types de blocs ou cibles de chambre auxquels cet effet de chambre s\'applique.',
    ChamberPrerequisites:'Liste des chambres devant être présentes avant que celle-ci soit disponible.',
    ChamberMutuallyExclusive:'Chambres ne pouvant pas être combinées/installées avec celle-ci.',
    ChamberChildren: 'Chambres enfants dans l\'arbre d\'amélioration ramifiant depuis cette chambre.',
    ChamberConfigGroups:'Groupes de configuration nommés utilisés par l\'interface réacteur pour regrouper les chambres associées.',
    ControlledBy:    'Noms de types XML des blocs contrôleurs pouvant contrôler ce bloc.',
    Controlling:     'Noms de types XML des blocs que ce bloc contrôleur peut contrôler.',
    MainCombinationController:   'Marque ce bloc comme contrôleur principal dans un système contrôleur/support/effet.',
    SupportCombinationController:'Marque ce bloc comme contrôleur de support dans le système de combinaison.',
    EffectCombinationController: 'Marque ce bloc comme contrôleur d\'effet (sortie) dans le système de combinaison.',
    Physical:        'Indique si le bloc participe en tant qu\'objet physique/pouvant entrer en collision dans le moteur physique.',
    CollisionDefault:'Forme de collision par défaut. Supporte Aucune, une forme de style bloc avec épaisseur de dalle, ou un maillage convexe nommé.',
    CubeCubeCollision:'Utilise une collision cube-contre-cube simple alignée sur les axes au lieu d\'un maillage détaillé.',
    UseDetailedCollisionForAstronautMode:'Active la forme de collision détaillée lorsque le joueur est en mode astronaute (marche).',
    DetailedCollisionForAstronautMode:'Forme de collision détaillée utilisée en mode astronaute ; généralement un maillage convexe pour les formes non cubiques.',
    LodCollisionPhysical:'Indique si la géométrie LOD réduite conserve les propriétés physiques/de collision.',
    Enterable:       'Indique si une entité ou un joueur peut passer dans ou occuper le volume du bloc.',
    LodShape:        'Nom de ressource de maillage basse résolution utilisé lorsque le rendu LOD s\'active à distance.',
    LodShapeSwitchStyleActive:'LOD d\'état actif ; activé lorsque le bloc est actif et LodActivationAnimationStyle = 1.',
    LodActivationAnimationStyle:'Mode de transition LOD d\'activation. 0 = pas de changement ; 1 = basculer vers le LOD actif lorsque le bloc est actif.',
    SensorInput:     'Permet à ce bloc d\'agir comme nœud capteur/entrée dans le réseau logique.',
    DrawLogicConnection:'Dessine des lignes de connexion filaires visibles entre ce bloc et les blocs logiques connectés.',
    LogicSignaledByRail:'Permet aux signaux de rail/rail activateur de piloter l\'état logique de ce bloc.',
    LogicBlockButton:'Traite ce bloc comme entrée bouton momentané dans le système logique.',
    Beacon:          'Marque ce bloc comme balise — visible sur les scanners et superpositions de navigation.',
    ResourceInjection:'Mode d\'injection de ressources pour la génération du monde. Off = aucune injection ; 1 = minerai/terrain ; 2 = flore.',
    ExplosionAbsorbtion:'Facteur d\'absorption d\'énergie d\'explosion utilisé par le système de dommages (0,0–1,0+).',
    StructureHPContribution:'Points de vie de structure supplémentaires fournis par ce bloc à la coque du vaisseau/station.',
    SourceReference: 'Référence un autre bloc ou entrée système comme source/parent de ce bloc.',
    ReactorHp:       'Contribution ou capacité en points de vie que ce bloc fournit au système de réacteur.',
    ReactorGeneralIconIndex:'Index d\'icône utilisé par l\'interface de configuration du réacteur/chambre.',
    LowHpSetting:    'Seuil ou paramètre comportemental appliqué lorsque les PV de structure tombent sous un niveau critique.',
    OldHitpoints:    'Valeur de PV héritée conservée pour la compatibilité des sauvegardes et la migration.',
    SystemBlock:     'Marque ce bloc comme faisant partie d\'un groupe système de vaisseau/station (armes, boucliers, propulseurs, etc.).',
    InventoryGroup:  'Catégorie/groupe utilisé pour trier et afficher le bloc dans le menu de construction/inventaire.',
    FullName:        'Nom d\'affichage long montré dans certains contextes d\'interface de jeu où la concision est moins importante.',
    WildcardIds:     'Identifiants de blocs alternatifs ou noms de types XML acceptés comme équivalents par certains systèmes de jeu.',
    _fallback: (key: string) =>
      `${key} depuis BlockConfig.xml. Ce champ est préservé et réenregistré pour la compatibilité StarMade.`,
  },

  // ── Titres de groupes de propriétés ──
  groupTitle: {
    resources:   'Ressources / Recettes',
    factory:     'Usine / Production',
    chambers:    'Chambres',
    controllers: 'Contrôleurs',
    collision:   'Collision / Physique',
    lod:         'LOD / Maillage',
    logic:       'Logique / Gameplay',
    reactor:     'Réacteur / Structure',
    inventory:   'Inventaire / Métadonnées',
    other:       'Autre',
  },

  // ── Labels de faces (boutons de texture) ──
  face: {
    front:  'AVANT',
    back:   'ARRIÈRE',
    top:    'DESSUS',
    bottom: 'DESSOUS',
    right:  'DROITE',
    left:   'GAUCHE',
  },

  // ── Option générique "Aucun" ──
  none: 'Aucun',

};

export default fr;
