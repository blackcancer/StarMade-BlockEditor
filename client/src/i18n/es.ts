/**
 * @fileoverview Spanish (es) locale strings — Español.
 *
 * Traducción española completa de la interfaz del StarMade Block Editor.
 * Todas las claves corresponden exactamente a la estructura de en.ts.
 *
 * @module i18n/es
 */

import type { Translations } from './en.js';

const es: Translations = {

  // ── App shell ──────────────────────────────────────────────────────────────
  app: {
    title:    '⚙ StarMade Block Editor',
    subtitle: 'v1.0.0',
    dirValid:   (name: string) => `✓ ${name}`,
    dirInvalid: '⚠ No hay directorio StarMade configurado',
    blockCount: (n: number) => `${n} bloque${n === 1 ? '' : 's'}`,
    reloadTooltip:   'Recargar bloques desde el disco',
    newBlockTooltip: 'Crear un nuevo bloque personalizado',
    reload:   '↺ Recargar',
    newBlock: '+ Nuevo bloque',
    textureResolution: 'Resolución de textura',
    texturePack:       'Paquete de texturas',
    language: 'Idioma',
  },

  // ── Config dialog ──────────────────────────────────────────────────────────
  config: {
    title:       '⚙ StarMade Block Editor',
    description: 'Establezca la ruta a su directorio de instalación de StarMade para comenzar.',
    placeholder: 'ej. D:/Games/StarMade/StarMade',
    save:        'Guardar y cargar bloques',
  },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    searchPlaceholder: '🔍 Buscar bloque…',
    filterVanilla:    (n: number) => `Vanilla (${n})`,
    filterCustom:     (n: number) => `Personalizado (${n})`,
    filterDeprecated: 'Obsoletos',
    loading: 'Cargando bloques…',
    empty:   'Ningún bloque coincide con la búsqueda.',
    footer:  (vanilla: number, custom: number) => `Vanilla: ${vanilla} · Personalizados: ${custom}`,
  },

  // ── Viewer column ──────────────────────────────────────────────────────────
  viewer: {
    emptyHint: 'Selecciona un bloque de la lista para previsualizarlo.',
    styleBadge: (name: string, index: number) => `${name} (estilo ${index})`,
    orientation: 'Orientación',
    orientOption: (i: number) => `Orient. ${i}`,
    prevOrientation: 'Orientación anterior',
    nextOrientation: 'Orientación siguiente',
    activationTexturePreview: 'Vista previa de textura de activación',
    lightPreview:  'Vista previa de luz',
    previewOn:  'ON',
    previewOff: 'OFF',
    toggle: 'Alternar',
    activePreviewTooltip:
      'Solo se muestra para LightSource o HasActivationTexture. CanActivate solo no tiene estado de textura.',
  },

  // ── Face selector ──────────────────────────────────────────────────────────
  faceSelector: {
    label:           'Caras de textura',
    manageatlas:     'Gestionar atlas personalizado…',
    hint:            'Haz clic en una cara para cambiar su mosaico de textura.',
    hintAllSame:     ' (Todas las caras comparten el mismo mosaico)',
    hintGrouped:     ' (3 grupos: front/back · top/bottom · lados)',
    hintIndependent: ' (6 caras independientes)',
    hintActivation:  ' La vista previa inactiva usa el mosaico inmediatamente a la derecha (+1), como la ruta de textura del estado activo del motor.',
    hintAnimated:    ' La vista previa animada cicla a través de 4 mosaicos cada 0,5 s.',
  },

  // ── Atlas picker ───────────────────────────────────────────────────────────
  atlasPicker: {
    titlePick:    'Seleccionar textura',
    titleManager: 'Gestor de atlas personalizado',
    close:        '✕',
    hintPick:     'Haz clic en un mosaico para seleccionarlo · Escape para cerrar',
    importAtlasDesc: (px: number, cols: number, rows: number) =>
      `Importar atlas StarMade completo: ${px}×${px} px (${cols}×${rows} mosaicos)`,
    mapDiffuse: 'Atlas difuso',
    mapNormal:  'Atlas normal',
    importFull: 'Importar atlas personalizado completo…',
    importing:  'Importando…',
    advancedSummary: 'Avanzado: reemplazar un mosaico',
    slotLabel:  'Ranura',
    replaceTile: 'Reemplazar mosaico seleccionado…',
    errorImportAtlas: (e: unknown) => `Error al importar el atlas personalizado: ${e}`,
    errorImportTile:  (e: unknown) => `Error al importar el mosaico: ${e}`,
  },

  // ── Icon picker ────────────────────────────────────────────────────────────
  iconPicker: {
    title: 'Iconos de construcción',
    close: '✕',
    hint:  'Haz clic en un icono para seleccionarlo · Escape para cerrar',
  },

  // ── Properties panel — general ─────────────────────────────────────────────
  properties: {
    empty: 'Selecciona un bloque para editar sus propiedades.',
    subtitleCustom:  'Bloque personalizado',
    subtitleVanilla: 'Bloque vanilla',
    vanillaNotice:
      '⚠ Bloque vanilla — los cambios se guardarán en customBlockConfig/BlockConfigImport.xml.',
    badgeCustom:     'Personalizado',
    badgeDeprecated: 'Obsoleto',
    save:   '💾 Guardar como personalizado',
    revert: '↩ Revertir',
    delete: '🗑 Eliminar',
    deleteTooltip: (name: string) =>
      `Eliminar este bloque de customBlockConfig/BlockConfigImport.xml`,
    deleteConfirm: (name: string) => `¿Eliminar el bloque personalizado ${name}?`,
    importIcon:    'Importar…',
    importingIcon: 'Importando…',
    pickIcon:      'Elegir…',
    pickIconTooltip: 'Elegir icono de construcción',
    errorImportIcon: (e: unknown) => `Error al importar el icono: ${e}`,
  },

  // ── Properties panel — section headings ────────────────────────────────────
  section: {
    identity:   'Identidad',
    stats:      'Estadísticas',
    shape:      'Forma',
    rendering:  'Renderizado / Textura',
    extra:      'Propiedades adicionales de BlockConfig',
    flags:      'Indicadores',
    lightColor: 'Color de luz',
    variants:   'Variantes',
  },

  // ── Properties panel — field labels & tooltips ─────────────────────────────
  field: {
    name:        { label: 'Nombre',          tooltip: 'Nombre mostrado por StarMade en inventarios, interfaz de tienda/construcción y listas de bloques.' },
    icon:        { label: 'Icono',           tooltip: 'Icono del menú de construcción. StarMade los almacena en hojas de iconos; este selector escribe la ranura correcta para iconos personalizados.' },
    description: { label: 'Descripción',     tooltip: 'Texto de descripción mostrado a los jugadores en la interfaz/tooltips de StarMade.' },
    hp:          { label: 'PS',              tooltip: 'Puntos de salud para el código de daño/destrucción. Valores más altos hacen el bloque más resistente.' },
    mass:        { label: 'Masa',            tooltip: 'Contribución de masa de un bloque. Afecta la masa de la nave/estación y por tanto el movimiento y la manejabilidad.' },
    volume:      { label: 'Volumen',         tooltip: 'Valor de volumen para sistemas de equilibrio y estadísticas de este tipo de bloque.' },
    price:       { label: 'Precio',          tooltip: 'Precio base en tienda/economía cuando el bloque está disponible para comercio.' },
    armor:       { label: 'Valor de armadura',tooltip: 'Factor general de armadura/resistencia para los cálculos de daño de StarMade.' },
    effectArmor: { label: 'Armadura de efecto',tooltip: 'Modificadores de armadura por tipo de daño. Expone resistencias de Calor, Cinética y EM mediante EffectArmor.' },
    blockStyle:  { label: 'Estilo de bloque',tooltip: 'Forma del malla seleccionada por BlockStyle: cubo, cuña, esquina, cruz, tetra, penta, etc.' },
    slab:        { label: 'Geometría de losa',tooltip: 'Grosor vertical de losa usado por el motor: bloque completo, 3/4, 1/2 o 1/4 de bloque.' },
    individualSides: { label: 'Modo de caras de textura', tooltip: 'Cómo se interpretan los IDs de textura: una textura para todas las caras, caras agrupadas o seis caras de textura independientes.' },
    computerRef: { label: 'Referencia de computadora', tooltip: 'Bloque controlador/computadora vinculado opcional para bloques de sistema que referencian un bloque de control.' },
    lodShapeFromFar: { label: 'Modelo LOD a distancia', tooltip: 'Malla LOD a distancia. StarMade cambia a esta representación de baja resolución al renderizar bloques lejanos.' },
    lightColor:  { label: 'Color',           tooltip: 'Color RGB emitido por una fuente de luz activa. StarMade lo lee como RGB directo, no HSL.' },
    lightRGBI:   { label: 'R V A Intensidad',tooltip: 'Valores de LightSourceColor. RGB son canales de color; el cuarto valor es el multiplicador de intensidad W usado por la iluminación del motor.' },
    slabIds:     { label: 'Variantes de losa',  tooltip: 'Vínculos a las variantes de losa de este bloque. StarMade usa estas asociaciones para navegar entre formas de losa relacionadas.' },
    styleIds:    { label: 'Variantes de estilo',tooltip: 'Vínculos a variantes de estilo/forma alternativas asociadas a este bloque.' },
    emissiveIntensity: 'Intensidad emisiva',
  },

  // ── Properties panel — flags ────────────────────────────────────────────────
  flag: {
    sideTexturesPointToOrientation: { label: 'Texturas siguen orientación', tooltip: 'Rota la búsqueda de textura lateral con la orientación del bloque. Para bloques orientados/de vía, para que las caras mantengan la textura esperada tras la rotación.' },
    hasActivationTexture:           { label: 'Textura de activación',        tooltip: 'Habilita el cambio de textura activo/inactivo. En el estado inactivo se usa el mosaico inmediatamente a la derecha de la textura base.' },
    extendedTexture4x4:             { label: 'Textura extendida 4×4',        tooltip: 'Usa una huella de textura 4×4 extendida en lugar de un único mosaico para bloques que requieren áreas de textura mayores.' },
    onlyDrawnInBuildMode:           { label: 'Solo en modo construcción',    tooltip: 'Solo se renderiza en contextos de construcción/edición; para bloques de ayuda/vista previa que no deben renderizarse normalmente.' },
    isPlacable:     { label: 'Colocable',        tooltip: 'Si los jugadores pueden colocar el bloque.' },
    inShop:         { label: 'En tienda',        tooltip: 'Si el bloque se vende en tiendas.' },
    hasOrientation: { label: 'Tiene orientación',tooltip: 'Si el bloque almacena la orientación de colocación.' },
    canActivate:    { label: 'Puede activarse',  tooltip: 'Si los jugadores pueden activar/desactivar el bloque (interacción de gameplay, no afecta a la textura).' },
    isDeprecated:   { label: 'Obsoleto',         tooltip: 'Marca el bloque como obsoleto para los sistemas de juego/interfaz, manteniendo la compatibilidad XML.' },
    lightSource:    { label: 'Fuente de luz',    tooltip: 'Si el bloque emite luz cuando está activo.' },
    transparency:   { label: 'Transparencia',    tooltip: 'Habilita el renderizado transparente/mezclado.' },
    door:           { label: 'Puerta',           tooltip: 'Indicador de comportamiento tipo puerta para sistemas de apertura/cierre.' },
    logicBlock:     { label: 'Bloque lógico',    tooltip: 'Si el bloque participa en la red lógica.' },
    animated:       { label: 'Animado',          tooltip: 'Si es verdadero, la textura del bloque cicla cada ~0,5 s a través de 4 mosaicos.' },
  },

  // ── Variant selector ────────────────────────────────────────────────────────
  variant: {
    add:     '+ Añadir variante…',
    none:    'Sin variantes',
    remove:  '× (eliminar)',
    unknown: 'Bloque desconocido',
  },

  // ── Advanced properties editor ─────────────────────────────────────────────
  advanced: {
    searchPlaceholder: (n: number) => `Buscar entre ${n} propiedad${n === 1 ? '' : 'es'}…`,
    clear:        'Borrar',
    noProperties: 'No hay propiedades adicionales de BlockConfig.',
    noMatch:      (q: string) => `Ninguna propiedad coincide con «${q}».`,

    recipeTitle:    'Participación en recetas',
    recipeDesc:     'Controla si StarMade incluye este bloque en los sistemas de recetas y producción. Los bloques desactivados conservan sus datos pero son ignorados por las recetas.',
    inRecipe:       'En la receta',
    recipeInactive: 'Los campos de receta están inactivos porque InRecipe es falso.',
    resourceCategory: 'Categoría de recurso',
    buyResources:     'Recursos de receta de compra',
    addBuyResource:   '+ Añadir recurso de compra',
    materialReqs:     'Requisitos de materiales',
    addMaterial:      '+ Añadir material',
    cubatomTitle:     'Consistencia de cubatom',
    cubatomSpec:      'especializado',
    addCubatom:       '+ Añadir material cubatom',
    noResources:      'Sin recursos.',

    producedIn:       'Producido en',
    basicFactory:     'Fábrica de recursos básicos',
    bakeTime:         'Tiempo de producción',
    factorySlot:      'Ranura de fábrica',
    factoryNone:      'Ninguno',
    factoryInput:     'Entrada',
    factoryOutput:    'Salida',

    generalChamber:   'Cámara general',
    capacity:         'Capacidad',
    rootChamber:      'Cámara raíz',
    parentChamber:    'Cámara padre',
    upgradesTo:       'Mejora a',
    permission:       'Permiso',
    configGroups:     'Grupos de configuración',
    addGroup:         '+ Añadir grupo',

    controlledBy:    'Controlado por',
    controls:        'Controla',
    addControlledBy: '+ Añadir controlador',
    addControls:     '+ Añadir bloque controlado',

    defaultCollision:   'Colisión por defecto',
    astronautCollision: 'Colisión en modo astronauta',
    collisionTooltip:   'Forma de colisión. El tipo de bloque usa un estilo de bloque nombrado con grosor de losa; el casco convexo usa un recurso de malla nombrado.',
    collisionNone:      'Ninguna',
    collisionBlockType: 'Estilo de bloque',
    collisionConvex:    'Casco convexo',
    collisionMeshPlaceholder: 'Nombre de la malla de colisión',

    defaultLod:  'Modelo LOD por defecto',
    activeLod:   'Modelo LOD activo',
    activationLodBehavior: 'Comportamiento de activación LOD',

    resourceInjection:   'Inyección de recursos',
    explosionAbsorption: 'Absorción de explosión',
  },

  // ── Property option labels ─────────────────────────────────────────────────
  options: {
    indSides: {
      allSame:     'Todas las caras — mismo mosaico',
      grouped:     'Caras agrupadas: front/back · top/bottom · lados',
      independent: 'Cada cara independiente',
    },
    slab: {
      full: 'Bloque completo',
      s34:  'Losa 3/4',
      s12:  'Losa 1/2',
      s14:  'Losa 1/4',
    },
    resourceType: {
      ore:          'Mineral',
      plant:        'Planta',
      basicResource:'Recurso básico',
      cubatom:      'Divisible en cubatom',
      manufactory:  'Manufactura',
      advanced:     'Avanzado',
      capsule:      'Cápsula',
    },
    factory: {
      none:             'Ninguna',
      capsuleRefinery:  'Refinería de cápsulas',
      microAssembler:   'Micro-ensamblador',
      componentFactory: 'Fábrica de componentes',
      blockAssembler:   'Ensamblador de bloques',
      chemicalFactory:  'Fábrica química',
    },
    resourceInjection: {
      off:   'Desactivado',
      ore:   'Mineral / recurso de terreno',
      flora: 'Recurso de flora',
    },
    lodAnimation: {
      noSwitch:  'Sin cambio LOD activo',
      useActive: 'Usar forma LOD activa mientras está activo',
    },
  },

  // ── Geometry / block style names ───────────────────────────────────────────
  blockStyle: {
    cube:   'Cubo',
    wedge:  'Cuña',
    corner: 'Esquina',
    cross:  'Cruz',
    tetra:  'Tetra',
    penta:  'Penta',
    hepta:  'Hepta',
    style:  (n: number) => `Estilo ${n}`,
  },

  // ── Extra property tooltips ────────────────────────────────────────────────
  extraTooltip: {
    Consistence:     'Requisitos de materiales de fabricación. StarMade lee entradas Item con un recuento y un tipo de bloque/recurso.',
    CubatomConsistence: 'Lista especial de materiales para la lógica de división de cubatom/cápsula. Generalmente vacía para bloques normales.',
    InRecipe:        'Controla si StarMade incluye este bloque en los sistemas de recetas/producción.',
    RecipeBuyResource:'Recursos adicionales consumidos por recetas de compra/fabricación.',
    BlockResourceType:'Categoría económica/de recursos para agrupar minerales, plantas, recursos básicos, outputs de manufactura, piezas avanzadas y cápsulas.',
    ProducedInFactory:'Nivel/categoría de fábrica que puede producir este bloque.',
    BasicResourceFactory:'Bloque de fábrica/recurso asociado a la producción de recursos básicos.',
    FactoryBakeTime: 'Tiempo de producción (en ticks de juego) para la cadena de fabricación.',
    Factory:         'Marca el rol de ranura de fábrica de este bloque — normalmente ENTRADA (ranura de recurso) o SALIDA (ranura de producto).',
    GeneralChamber:  'Marca una cámara de reactor como cámara general/raíz en el sistema de reactor.',
    ChamberCapacity: 'Contribución de capacidad proporcionada al reactor por esta cámara.',
    ChamberRoot:     'Cámara raíz a la que pertenece esta cámara en el árbol de mejoras.',
    ChamberParent:   'Cámara padre requerida antes de instalar esta.',
    ChamberUpgradesTo:'Cámara disponible una vez instalada esta cámara.',
    ChamberPermission:'Indicador de nivel de permiso/acceso para el sistema de cámaras.',
    ChamberAppliesTo: 'Tipos de bloque o destinos de cámara a los que se aplica este efecto de cámara.',
    ChamberPrerequisites:'Lista de cámaras que deben estar presentes antes de que esta esté disponible.',
    ChamberMutuallyExclusive:'Cámaras que no pueden combinarse/instalarse junto a esta.',
    ChamberChildren: 'Cámaras hijas en el árbol de mejoras que se ramifican desde esta cámara.',
    ChamberConfigGroups:'Grupos de configuración nombrados usados por la interfaz del reactor.',
    ControlledBy:    'Nombres de tipo XML de bloques controladores que pueden controlar este bloque.',
    Controlling:     'Nombres de tipo XML de bloques que este bloque controlador puede controlar.',
    MainCombinationController:   'Marca este bloque como el controlador principal en un sistema de combinación controlador/soporte/efecto.',
    SupportCombinationController:'Marca este bloque como controlador de soporte en el sistema de combinación.',
    EffectCombinationController: 'Marca este bloque como controlador de efecto (salida) en el sistema de combinación.',
    Physical:        'Si el bloque participa como objeto físico/con colisión en el motor de física.',
    CollisionDefault:'Forma de colisión por defecto. Admite Ninguna, una forma de estilo bloque con grosor de losa, o una malla convexa nombrada.',
    CubeCubeCollision:'Usa colisión simple cubo contra cubo alineada con ejes en lugar de una malla detallada.',
    UseDetailedCollisionForAstronautMode:'Activa la forma de colisión detallada en modo astronauta (caminando).',
    DetailedCollisionForAstronautMode:'Forma de colisión detallada en modo astronauta; normalmente una malla convexa para formas no cúbicas.',
    LodCollisionPhysical:'Si la geometría reducida por LOD retiene propiedades físicas/de colisión.',
    Enterable:       'Si una entidad o jugador puede entrar o ocupar el volumen del bloque.',
    LodShape:        'Nombre de recurso de malla de baja resolución cuando se activa el renderizado LOD a distancia.',
    LodShapeSwitchStyleActive:'Malla LOD de estado activo; activa cuando el bloque está activo y LodActivationAnimationStyle = 1.',
    LodActivationAnimationStyle:'Modo de transición de activación LOD. 0 = sin cambio; 1 = cambiar a malla LOD activa cuando el bloque está activo.',
    SensorInput:     'Permite que este bloque actúe como nodo sensor/entrada en la red lógica.',
    DrawLogicConnection:'Dibuja líneas de conexión/cable visibles entre este bloque y bloques lógicos conectados.',
    LogicSignaledByRail:'Permite que las señales de vía/activador de vía controlen el estado lógico de este bloque.',
    LogicBlockButton: 'Trata este bloque como entrada de botón momentáneo en el sistema lógico.',
    Beacon:          'Marca este bloque como baliza — visible en escáneres y superposiciones de navegación.',
    ResourceInjection:'Modo de inyección de recursos para la generación del mundo. Desactivado = sin inyección; 1 = mineral/terreno; 2 = flora.',
    ExplosionAbsorbtion:'Factor de absorción de energía de explosión en el sistema de daño (0,0–1,0+).',
    StructureHPContribution:'Puntos de salud de estructura adicionales que este bloque aporta al casco de la nave/estación.',
    SourceReference:  'Referencia a otro bloque o entrada del sistema como fuente/padre de este bloque.',
    ReactorHp:       'Contribución o capacidad de puntos de salud que este bloque aporta al sistema del reactor.',
    ReactorGeneralIconIndex:'Índice de icono usado por la interfaz de configuración del reactor/cámara.',
    LowHpSetting:    'Umbral de comportamiento o configuración aplicado cuando los PS de estructura caen a un nivel crítico.',
    OldHitpoints:    'Valor de PS heredado conservado para compatibilidad con partidas guardadas y migración.',
    SystemBlock:     'Marca este bloque como parte de un grupo de sistema de nave/estación (armas, escudos, propulsores, etc.).',
    InventoryGroup:  'Categoría/grupo para ordenar y mostrar el bloque en el menú de construcción/inventario.',
    FullName:        'Nombre de visualización largo mostrado en algunos contextos de interfaz del juego.',
    WildcardIds:     'IDs de bloque alternativos o nombres de tipo XML aceptados como equivalentes por ciertos sistemas del juego.',
    _fallback: (key: string) =>
      `${key} de BlockConfig.xml. Este campo se preserva y se vuelve a guardar para compatibilidad con StarMade.`,
  },

  // ── Extra property group titles ──
  groupTitle: {
    resources:   'Recursos / Recetas',
    factory:     'Fábrica / Producción',
    chambers:    'Cámaras',
    controllers: 'Controladores',
    collision:   'Colisión / Física',
    lod:         'LOD / Malla',
    logic:       'Lógica / Gameplay',
    reactor:     'Reactor / Estructura',
    inventory:   'Inventario / Metadatos',
    other:       'Otros',
  },

  // ── Face labels ──
  face: {
    front:  'FRENTE',
    back:   'ATRÁS',
    top:    'ARRIBA',
    bottom: 'ABAJO',
    right:  'DERECHA',
    left:   'IZQUIERDA',
  },

  // ── Generic None option ──
  none: 'Ninguno',

};

export default es;
