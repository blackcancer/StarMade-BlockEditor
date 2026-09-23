/**
 * @fileoverview English (en) locale strings.
 *
 * All UI-visible strings for the StarMade Block Editor in English.
 * This is the reference/fallback locale — all keys defined here must
 * also be defined in every other locale file.
 *
 * Organised by feature area to match the component hierarchy.
 *
 * @module i18n/en
 */

const en = {
  mobile: {"navigation": "Editor panels", "blocks": "Blocks", "preview": "Preview", "properties": "Properties"},
  extraLabel: {
    MainCombinationController: "Main combination controller",
    SupportCombinationController: "Support combination controller",
    EffectCombinationController: "Effect combination controller",
    Physical: "Physical collision",
    CubeCubeCollision: "Cube-to-cube collision",
    LodCollisionPhysical: "Physical LOD collision",
    UseDetailedCollisionForAstronautMode: "Detailed astronaut collision",
    Enterable: "Can be entered",
    SensorInput: "Sensor input",
    DrawLogicConnection: "Show logic connections",
    LogicSignaledByRail: "Rail logic signal",
    LogicBlockButton: "Momentary logic button",
    Beacon: "Beacon",
    StructureHPContribution: "Structure HP contribution",
    SourceReference: "Source reference",
    ReactorHp: "Reactor HP",
    ReactorGeneralIconIndex: "Reactor icon",
    LowHpSetting: "Low HP setting",
    OldHitpoints: "Legacy hitpoints",
    SystemBlock: "System block",
    InventoryGroup: "Inventory group",
    FullName: "Full name",
    WildcardIds: "Alternative block IDs",
  },
  errors: {
    textureTile: (value: string) => "Texture tile " + value + " is outside the native StarMade atlas.",
    numberValue: (value: string) => "" + value + " must be a finite number.",
    textValue: (value: string) => "" + value + " must be text.",
    booleanValue: (value: string) => "" + value + " must be enabled or disabled.",
    technicalDetails: "Technical details",
    unknown: "The operation could not be completed. Retry or reload the editor.",
    conflict: "The files changed outside this editor. Keep a copy of your draft, then Reload and Revert to load the current version before saving.",
    reload: "Reload the block catalogue before saving.",
    configuration: "Choose an existing StarMade installation in Settings.",
    configRead: "The editor settings could not be read or saved.",
    catalogue: "The block catalogue could not be read or saved. Check the installation files.",
    network: "The server could not be reached. Check the connection and retry.",
    permission: "This operation is not permitted in this editor session.",
    invalidData: "Some values are invalid. Check the fields before saving.",
    image: "The image could not be loaded. Check its format and dimensions.",
    imageMissing: "The selected image or icon sheet is missing from this installation.",
    iconBackup: "No original icon backup is available for this slot.",
    nativeShaders: "The StarMade shader files are missing from this installation.",
    nativeTextures: "No native textures are available for this pack and resolution.",
    nativeLod: "The native model files are missing or invalid.",
    shader: "The native shader could not compile. Reload the preview.",
    context: "The graphics context was lost. Reload the preview.",
    capture: "The icon could not be generated. Reload the preview and retry.",
    notFound: "The selected block no longer exists. Reload the catalogue.",
    vanillaDelete: "Original game blocks cannot be deleted. Only custom definitions can be removed.",
    noIds: "No free block identifier remains for a new custom block.",
    unsafePath: "The requested file is outside the permitted installation files.",
    invalidValue: (value: string) => "Invalid value for " + value + ".",
    imageDimensions: (value: string) => "Expected image dimensions: " + value + ".",
    animationTile: (value: string) => "The animation at tile " + value + " exceeds its atlas page.",
    missingLayer: (value: string) => "Texture layer " + value + " is missing from the selected installation.",
    missingModel: (value: string) => "The native model " + value + " could not be loaded.",
    http: (value: string) => "The server returned HTTP " + value + ". Retry or reload.",
  },
  warnings: {
    missingLayer: (value: string) => "Texture layer " + value + " is missing.",
    missingNormal: (value: string) => "Normal material layer " + value + " is missing.",
    normalAlpha: (value: string) => "Normal layer " + value + " has no alpha channel; material alpha is set to zero.",
    overlay: "The native overlay texture is missing.",
    lod: "Native LOD model declarations are missing.",
    unknown: "Some preview resources are unavailable.",
  },


  // ── App shell ──────────────────────────────────────────────────────────────
  app: {
    settings: "Settings",
    title:    '⚙ StarMade Block Editor',
    subtitle: 'v1.1.3',
    /** Shown in the header path indicator when the directory is valid. */
    dirValid: (name: string) => `✓ ${name}`,
    /** Shown in the header path indicator when no directory is configured. */
    dirInvalid: '⚠ No StarMade directory configured',
    blockCount: (n: number) => `${n} block${n === 1 ? '' : 's'}`,
    reloadTooltip:  'Reload blocks from disk',
    newBlockTooltip: 'Create a new custom block',
    reload:   '↺ Reload',
    newBlock: '+ New Block',
    textureResolution: 'Texture resolution',
    texturePack:       'Texture pack',
    /** Language switcher label */
    language: 'Language',
  },

  // ── Config dialog (first-run overlay) ──────────────────────────────────────
  config: {
    directoryLabel: "StarMade directory",
    title:       '⚙ StarMade Block Editor',
    description: 'Set the path to your StarMade installation directory to get started.',
    placeholder: 'e.g. D:/Games/StarMade/StarMade',
    save:        'Save & Load Blocks',
  },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    discardConfirm: "Discard unsaved changes to this block?",
    searchPlaceholder: '🔍 Search block…',
    filterVanilla:   (n: number) => `Vanilla (${n})`,
    filterCustom:    (n: number) => `Custom (${n})`,
    filterDeprecated: 'Deprecated',
    loading: 'Loading blocks…',
    empty:   'No blocks match your search.',
    footer:  (vanilla: number, custom: number) => `Vanilla: ${vanilla} · Custom: ${custom}`,
  },

  // ── Viewer column ──────────────────────────────────────────────────────────
  viewer: {
    modelPreview: "Active model preview",
    nativeLoading: "Loading StarMade renderer…",
    nativeError: (detail: string) => "3D preview unavailable: " + detail,
    webgl2Required: "This preview requires WebGL 2.",
    nativeWarnings: (detail: string) => "Preview resources: " + detail,
    emptyHint: 'Select a block from the list to preview it.',
    /** "Cube (style 0)" badge */
    styleBadge: (name: string, index: number) => `${name} (style ${index})`,
    orientation: 'Orientation',
    /** "Orient 3" */
    orientOption: (i: number) => `Orient ${i}`,
    prevOrientation: 'Previous orientation',
    nextOrientation: 'Next orientation',
    /** Active/inactive preview toggle */
    activationTexturePreview: 'Activation texture preview',
    lightPreview:  'Light preview',
    previewOn:  'ON',
    previewOff: 'OFF',
    toggle: 'Toggle',
    /** Tooltip shown on the single toggle button */
    toggleTooltip: (label: string, state: string) => `${label}: ${state}`,
    /** Tooltip on the active-state label */
    activePreviewTooltip:
      "Preview light, activation textures and active LOD models when the block defines them.",
  },

  // ── Face selector ──────────────────────────────────────────────────────────
  faceSelector: {
    label:          'Texture faces',
    manageatlas:    'Manage custom atlas…',
    hint:           'Click a face to change its texture tile.',
    hintAllSame:    ' (All faces share one tile)',
    hintGrouped: " (Top, bottom and four shared sides)",
    hintIndependent:' (6 independent faces)',
    hintActivation: ' Inactive preview uses the tile immediately to the right (+1), like the engine active-state texture path.',
    hintAnimated:   " Uses the same texture animation as StarMade.",
  },

  // ── Atlas picker ───────────────────────────────────────────────────────────
  atlasPicker: {
    closeLabel: "Close",
    titlePick:    'Pick texture',
    titleManager: 'Custom atlas manager',
    close:        '✕',
    hintPick:     'Click a tile to select · Escape to close',
    /** "Import a full StarMade custom atlas: 4096×4096px (16×16 tiles)" */
    importAtlasDesc: (px: number, cols: number, rows: number) =>
      `Import a full StarMade custom atlas: ${px}×${px}px (${cols}×${rows} tiles)`,
    mapDiffuse: 'Diffuse atlas',
    mapNormal:  'Normal atlas',
    importFull: 'Import full custom atlas…',
    importing:  'Importing…',
    advancedSummary: 'Advanced: replace one tile',
    slotLabel:  'Slot',
    replaceTile: 'Replace selected tile…',
    reload:      'Reload textures',
    errorImportAtlas: (e: unknown) => `Custom atlas import failed: ${e}`,
    errorImportTile:  (e: unknown) => `Tile import failed: ${e}`,
  },

  // ── Icon picker ────────────────────────────────────────────────────────────
  iconPicker: {
    closeLabel: "Close",
    title: 'Build Icons',
    close: '✕',
    hint:  'Click an icon to select · Escape to close',
  },

  // ── Properties panel — general ─────────────────────────────────────────────
  properties: {
    generateIcon: "Generate from block",
    generatingIcon: "Generating…",
    applyGeneratedIcon: "Apply icon",
    generatedIconPreview: "Generated icon preview",
    cancelGeneratedIcon: "Cancel",
    iconWriteNotice: "Import replaces the game icon. A backup is kept so you can restore it.",
    restoreIcon: "Restore original icon",
    empty: 'Select a block to edit its properties.',
    /** "Custom block" / "Vanilla block" in the subtitle line */
    subtitleCustom:  'Custom block',
    subtitleVanilla: 'Vanilla block',
    /** Orange warning banner for vanilla blocks */
    vanillaNotice:
      '⚠ Vanilla block — changes will be saved to customBlockConfig/BlockConfigImport.xml.',
    badgeCustom:     'Custom',
    badgeDeprecated: 'Deprecated',
    /** Footer action buttons */
    save:   '💾 Save to Custom',
    revert: '↩ Revert',
    delete: '🗑 Delete',
    /** Override vanilla: force-write a vanilla block to custom file */
    overrideVanilla:        '✏️ Override vanilla',
    overrideVanillaTooltip: 'Write this vanilla block directly into customBlockConfig/BlockConfigImport.xml to allow deep modding.',
    deleteTooltip: (name: string) =>
      `Remove this block from customBlockConfig/BlockConfigImport.xml`,
    deleteConfirm: (name: string) => `Delete custom block ${name}?`,
    /** Icon import */
    importIcon:    'Import…',
    importingIcon: 'Importing…',
    pickIcon:      'Pick…',
    pickIconTooltip: 'Pick build icon',
    errorImportIcon: (e: unknown) => `Icon import failed: ${e}`,
  },

  // ── Properties panel — section headings ────────────────────────────────────
  section: {
    identity:   'Identity',
    stats:      'Stats',
    shape:      'Shape',
    rendering:  'Rendering / Texture',
    extra:      'Additional BlockConfig properties',
    flags:      'Flags',
    lightColor: 'Light Color',
    variants:   'Variants',
  },

  // ── Properties panel — field labels & tooltips ─────────────────────────────
  field: {
    damageHeat: "Heat",
    damageKinetic: "Kinetic",
    damageEM: "EM",
    name:        { label: 'Name',        tooltip: 'Display name shown by StarMade in inventories, shop/build UI and block lists.' },
    icon:        { label: 'Build icon',  tooltip: 'Inventory/build-menu icon. StarMade stores these in build-icons sheets; this picker writes the correct sheet slot for custom icons.' },
    description: { label: 'Description', tooltip: 'Description text shown to players in StarMade UI/tooltips.' },
    hp:          { label: 'HP',          tooltip: 'Hitpoints used by damage/destruction code. Higher values make each placed block harder to destroy.' },
    mass:        { label: 'Mass',        tooltip: 'Mass contribution of one block. Used by ship/station mass and therefore affects movement and handling.' },
    volume:      { label: 'Volume',      tooltip: 'Volume value used by balancing/stat systems for this block type.' },
    price:       { label: 'Price',       tooltip: 'Base shop/economy price used when the block is available for trade.' },
    armor:       { label: 'Armor value', tooltip: 'General armor/resistance factor used by StarMade damage calculations.' },
    effectArmor: { label: 'Effect Armor',tooltip: 'Per-damage-type armor modifiers. Source exposes Heat, Kinetic and EM resistances through EffectArmor.' },
    blockStyle:  { label: 'Block Style', tooltip: 'Mesh shape selected by BlockStyle: cube, wedge, corner, cross, tetra, penta, etc.' },
    slab:        { label: 'Slab geometry',tooltip: 'Vertical slab thickness used by the engine: full, 3/4, 1/2 or 1/4 block.' },
    individualSides: { label: 'Texture face mode', tooltip: 'How texture IDs are interpreted: one texture for all faces, grouped faces, or six independent face textures.' },
    computerRef: { label: 'Computer reference', tooltip: 'Optional linked controller/computer block used by system blocks that reference a control block.' },
    lodShapeFromFar: { label: 'Far-distance model', tooltip: 'LOD shape used at distance. StarMade switches to this low-detail representation when rendering far-away blocks.' },
    lightColor:  { label: 'Color',   tooltip: 'RGB color emitted by an active light source. StarMade reads this as direct RGB, not HSL.' },
    lightRGBI:   { label: 'R G B Intensity', tooltip: 'LightSourceColor values. RGB are color channels; the fourth value is the W intensity multiplier used by engine lighting.' },
    slabIds:     { label: 'Slab variants',  tooltip: 'Links to this block\'s slab variants. StarMade uses these associations to navigate related slab forms.' },
    styleIds:    { label: 'Style variants', tooltip: 'Links to alternate style/shape variants associated with this block.' },
    emissiveIntensity: 'Emissive intensity',
  },

  // ── Properties panel — flags ────────────────────────────────────────────────
  flag: {
    sideTexturesPointToOrientation: { label: 'Textures follow orientation', tooltip: 'Rotates side texture lookup with block orientation. Used by oriented/rail-like blocks so faces keep the expected texture after placement rotation.' },
    hasActivationTexture:           { label: 'Activation texture',          tooltip: 'Enables active/inactive texture state. In source, inactive state uses the tile immediately to the right of the base texture.' },
    extendedTexture4x4:             { label: 'Extended 4×4 texture',        tooltip: 'Uses an extended 4×4 texture footprint instead of a single tile for blocks requiring larger texture areas.' },
    onlyDrawnInBuildMode:           { label: 'Build-mode only',             tooltip: 'Only rendered in build/edit contexts; used for helper/preview-only blocks that should not render normally.' },
    isPlacable:     { label: 'Placable',     tooltip: 'Whether the block can be placed by players.' },
    inShop:         { label: 'In shop',      tooltip: 'Whether the block is sold in shops.' },
    hasOrientation: { label: 'Has orientation', tooltip: 'Whether the block stores placement orientation.' },
    canActivate:    { label: 'Can activate', tooltip: 'Whether the block can be toggled/activated by players (gameplay interaction, does not affect texture).' },
    isDeprecated:   { label: 'Deprecated',   tooltip: 'Marks the block as obsolete for game/UI systems while preserving XML compatibility.' },
    lightSource:    { label: 'Light source', tooltip: 'Whether the block emits light when active.' },
    transparency:   { label: 'Transparency', tooltip: 'Enables transparent/blended rendering.' },
    door:           { label: 'Door',         tooltip: 'Door-type behaviour flag used by opening/closing systems.' },
    logicBlock:     { label: 'Logic block',  tooltip: 'Whether the block participates in the logic network.' },
    animated:       { label: 'Animated',     tooltip: "Animates textures with the frame sequence and timing used by StarMade." },
  },

  // ── Variant selector ────────────────────────────────────────────────────────
  variant: {
    add:     '+ Add variant…',
    none:    'No variants',
    remove:  '× (remove)',
    unknown: 'Unknown block',
  },

  // ── Advanced properties editor ─────────────────────────────────────────────
  advanced: {
    value: "Value",
    count: "Count",
    searchPlaceholder: (n: number) => `Search ${n} ${n === 1 ? 'property' : 'properties'}…`,
    clear:       'Clear',
    noProperties:'No additional BlockConfig properties.',
    noMatch:     (q: string) => `No property matches "${q}".`,

    // Resources / Recipes
    recipeTitle:    'Recipe participation',
    recipeDesc:     'Controls whether StarMade includes this block in recipe and production systems. Disabled blocks keep their data but are ignored by recipes.',
    inRecipe:       'In recipe',
    recipeInactive: 'Recipe fields are inactive because InRecipe is false.',
    resourceCategory: 'Resource category',
    buyResources:     'Buy recipe resources',
    addBuyResource:   '+ Add buy resource',
    materialReqs:     'Material requirements',
    addMaterial:      '+ Add material',
    cubatomTitle:     'Cubatom consistence',
    cubatomSpec:      'specialized',
    addCubatom:       '+ Add cubatom material',
    noResources:      'No resources.',

    // Factory / Production
    producedIn:       'Produced in',
    basicFactory:     'Basic resource factory',
    bakeTime:         'Bake time',
    factorySlot:      'Factory slot',
    factoryNone:      'None',
    factoryInput:     'Input',
    factoryOutput:    'Output',

    // Chambers
    generalChamber:   'General chamber',
    capacity:         'Capacity',
    rootChamber:      'Root chamber',
    parentChamber:    'Parent chamber',
    upgradesTo:       'Upgrades to',
    permission:       'Permission',
    configGroups:     'Config groups',
    addGroup:         '+ Add group',

    // Controllers
    controlledBy:    'Controlled by',
    controls:        'Controls',
    addControlledBy: '+ Add controlled by',
    addControls:     '+ Add controls',

    // Collision
    defaultCollision:   'Default collision',
    astronautCollision: 'Astronaut collision',
    collisionTooltip:   'Collision shape. Block type uses a named block style and slab thickness; convex hull uses a named mesh resource.',
    collisionNone:      'None',
    collisionBlockType: 'Block style',
    collisionConvex:    'Convex hull mesh',
    collisionMeshPlaceholder: 'Collision mesh name',

    // LOD / Mesh
    defaultLod:  'Default LOD model',
    activeLod:   'Active LOD model',
    activationLodBehavior: 'Activation LOD behavior',

    // Logic / Gameplay
    resourceInjection:   'Resource injection',
    explosionAbsorption: 'Explosion absorption',
  },

  // ── Property option labels (select options) ────────────────────────────────
  options: {
    indSides: {
      allSame:  'All faces same tile',
      grouped:  "Grouped faces: top · bottom · four shared sides",
      independent: 'Each face independent',
    },
    slab: {
      full: 'Full block',
      s34:  '3/4 slab',
      s12:  '1/2 slab',
      s14:  '1/4 slab',
    },
    resourceType: {
      ore:          'Ore',
      plant:        'Plant',
      basicResource:'Basic resource',
      cubatom:      'Cubatom-splittable',
      manufactory:  'Manufactory',
      advanced:     'Advanced',
      capsule:      'Capsule',
    },
    factory: {
      none:               'None',
      capsuleRefinery:    'Capsule refinery',
      microAssembler:     'Micro assembler',
      componentFactory:   'Component factory',
      blockAssembler:     'Block assembler',
      chemicalFactory:    'Chemical factory',
    },
    resourceInjection: {
      off:     'Off',
      ore:     'Ore / terrain resource',
      flora:   'Flora resource',
    },
    lodAnimation: {
      noSwitch:   'No active LOD switch',
      useActive:  'Use active LOD shape while active',
    },
  },

  // ── Geometry / block style names ───────────────────────────────────────────
  blockStyle: {
    cube:   'Cube',
    wedge:  'Wedge',
    corner: 'Corner',
    cross:  'Cross',
    tetra:  'Tetra',
    penta:  'Penta',
    hepta:  "Cube (24 orientations)",
    style:  (n: number) => `Style ${n}`,
  },

  // ── Extra property tooltips (StarMade field descriptions) ──────────────────
  extraTooltip: {
    Consistence:     'Crafting/material requirements. StarMade reads Item entries with a count and a block/resource type.',
    CubatomConsistence: 'Special material list used by cubatom/capsule splitting logic. Usually empty for regular blocks.',
    InRecipe:        'Controls whether StarMade includes this block in recipe/production systems.',
    RecipeBuyResource:'Additional resources consumed by buy/craft recipes.',
    BlockResourceType:'Economy/resource category used to group ores, plants, basic resources, manufactory outputs, advanced parts and capsules.',
    ProducedInFactory:'Factory tier/category that can produce this block.',
    BasicResourceFactory:'Factory/resource block associated with basic-resource production.',
    FactoryBakeTime:  'Production time (in game ticks) used by the factory pipeline.',
    Factory:          'Marks a factory slot role for this block — typically INPUT (resource slot) or OUTPUT (product slot).',
    GeneralChamber:   'Marks a reactor chamber as a general/root-capable chamber in the reactor system.',
    ChamberCapacity:  'Capacity contribution provided to the reactor by this chamber.',
    ChamberRoot:      'Root chamber this chamber belongs to in the upgrade tree.',
    ChamberParent:    'Parent chamber required before this one can be installed.',
    ChamberUpgradesTo:'Chamber that becomes available once this chamber is installed.',
    ChamberPermission:'Permission/access level flag for the chamber system.',
    ChamberAppliesTo: 'Block types or chamber targets this chamber effect applies to.',
    ChamberPrerequisites:'List of chambers that must be present before this one is available.',
    ChamberMutuallyExclusive:'Chambers that cannot be combined/installed alongside this one.',
    ChamberChildren:  'Child chambers in the upgrade tree branching from this chamber.',
    ChamberConfigGroups:'Named configuration groups used by the reactor UI to group related chambers.',
    ControlledBy:     'XML type names of controller blocks that can control this block.',
    Controlling:      'XML type names of blocks this controller block can control.',
    MainCombinationController:   'Marks this block as the primary controller in a controller/support/effect combination system.',
    SupportCombinationController:'Marks this block as a support controller in the combination system.',
    EffectCombinationController: 'Marks this block as an effect (output) controller in the combination system.',
    Physical:         'Whether the block participates as a physical/collidable object in the physics engine.',
    CollisionDefault: 'Default collision shape. Supports None (no collision), a block-style shape with slab thickness, or a named convex hull mesh.',
    CubeCubeCollision:'Uses simple axis-aligned cube-vs-cube collision instead of a detailed mesh.',
    UseDetailedCollisionForAstronautMode:'Enables the detailed collision shape when the player is in astronaut (walking) mode.',
    DetailedCollisionForAstronautMode:'The detailed collision shape used in astronaut mode; typically a convex hull mesh for non-cube block shapes.',
    LodCollisionPhysical:'Whether LOD-reduced geometry retains physical/collision properties.',
    Enterable:        'Whether an entity or player can pass into or occupy the block volume.',
    LodShape:         'Low-detail mesh resource name used when LOD rendering activates at distance.',
    LodShapeSwitchStyleActive:'Active-state LOD mesh; enabled when the block is active and LodActivationAnimationStyle = 1.',
    LodActivationAnimationStyle:'LOD activation transition mode. 0 = no switch; 1 = swap to active LOD mesh while block is active.',
    SensorInput:      'Allows this block to act as a sensor/input node in the logic network.',
    DrawLogicConnection:'Draws visible wire/connection lines between this block and connected logic blocks.',
    LogicSignaledByRail:'Allows rail/activator rail signals to drive the logic state of this block.',
    LogicBlockButton: 'Treats this block as a momentary button input in the logic system.',
    Beacon:           'Marks this block as a beacon — visible on scanners and navigation overlays.',
    ResourceInjection:'Resource injection mode for world generation. Off = no injection; 1 = ore/terrain; 17 = flora.',
    ExplosionAbsorbtion:'Explosion energy absorption factor used by the damage system (0.0–1.0+).',
    StructureHPContribution:'Additional structure hit points contributed by this block to the ship/station hull.',
    SourceReference:  'References another block or system entry as the source/parent of this block.',
    ReactorHp:        'Hit point contribution or capacity this block provides to the reactor system.',
    ReactorGeneralIconIndex:'Icon index used by the reactor/chamber configuration UI.',
    LowHpSetting:     'Behavioral threshold or setting applied when the structure drops below a critical HP level.',
    OldHitpoints:     'Legacy hit point value retained for save-game compatibility and migration.',
    SystemBlock:      'Marks this block as part of a ship/station system group (weapons, shields, thrusters, etc.).',
    InventoryGroup:   'Category/group used to sort and display the block in the build/inventory menu.',
    FullName:         'Long-form display name shown in some game UI contexts where brevity is less important.',
    WildcardIds:      'Alternative block IDs or XML type names accepted as equivalent by certain game systems.',
    /** Fallback for unknown keys */
    _fallback: (key: string) =>
      `${key} from BlockConfig.xml. This field is preserved and saved back for StarMade compatibility.`,
  },

  // ── Extra property group titles ──
  groupTitle: {
    resources:   'Resources / Recipes',
    factory:     'Factory / Production',
    chambers:    'Chambers',
    controllers: 'Controllers',
    collision:   'Collision / Physical',
    lod:         'LOD / Mesh',
    logic:       'Logic / Gameplay',
    reactor:     'Reactor / Structure',
    inventory:   'Inventory / Metadata',
    other:       'Other',
  },

  // ── Face labels (FRONT/BACK/TOP/BOTTOM/RIGHT/LEFT buttons) ──
  face: {
    front:  'FRONT',
    back:   'BACK',
    top:    'TOP',
    bottom: 'BOTTOM',
    right:  'RIGHT',
    left:   'LEFT',
  },

  // ── Generic None option ──
  none: 'None',

};
/**
 * Canonical translation object shape for every supported locale.
 *
 * The English dictionary defines the complete nested key structure consumed by the UI. Other locale files are typed against this shape so missing or misspelled translation keys are caught during TypeScript compilation.
 */

export type Translations = typeof en;
export default en;
