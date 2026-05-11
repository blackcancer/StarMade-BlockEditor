/**
 * @fileoverview German (de) locale strings — Deutsch.
 *
 * Vollständige deutsche Übersetzung der StarMade Block Editor Benutzeroberfläche.
 * Alle Schlüssel entsprechen exakt der Struktur von en.ts.
 *
 * @module i18n/de
 */

import type { Translations } from './en.js';

const de: Translations = {

  // ── App shell ──────────────────────────────────────────────────────────────
  app: {
    title:    '⚙ StarMade Block Editor',
    subtitle: 'v1.0.0',
    dirValid:   (name: string) => `✓ ${name}`,
    dirInvalid: '⚠ Kein StarMade-Verzeichnis konfiguriert',
    blockCount: (n: number) => `${n} Block${n === 1 ? '' : 's'}`,
    reloadTooltip:   'Blöcke vom Datenträger neu laden',
    newBlockTooltip: 'Neuen benutzerdefinierten Block erstellen',
    reload:   '↺ Neu laden',
    newBlock: '+ Neuer Block',
    textureResolution: 'Texturauflösung',
    texturePack:       'Texturpaket',
    language: 'Sprache',
  },

  // ── Config dialog ──────────────────────────────────────────────────────────
  config: {
    title:       '⚙ StarMade Block Editor',
    description: 'Legen Sie den Pfad zu Ihrem StarMade-Installationsverzeichnis fest, um zu beginnen.',
    placeholder: 'z. B. D:/Games/StarMade/StarMade',
    save:        'Speichern & Blöcke laden',
  },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    searchPlaceholder: '🔍 Block suchen…',
    filterVanilla:    (n: number) => `Vanilla (${n})`,
    filterCustom:     (n: number) => `Benutzerdefiniert (${n})`,
    filterDeprecated: 'Veraltet',
    loading: 'Blöcke werden geladen…',
    empty:   'Keine Blöcke entsprechen der Suche.',
    footer:  (vanilla: number, custom: number) => `Vanilla: ${vanilla} · Benutzerdefiniert: ${custom}`,
  },

  // ── Viewer column ──────────────────────────────────────────────────────────
  viewer: {
    emptyHint: 'Wählen Sie einen Block aus der Liste aus, um ihn anzuzeigen.',
    styleBadge: (name: string, index: number) => `${name} (Stil ${index})`,
    orientation: 'Ausrichtung',
    orientOption: (i: number) => `Ausricht. ${i}`,
    prevOrientation: 'Vorherige Ausrichtung',
    nextOrientation: 'Nächste Ausrichtung',
    activationTexturePreview: 'Aktivierungstextur-Vorschau',
    lightPreview:  'Licht-Vorschau',
    previewOn:  'AN',
    previewOff: 'AUS',
    toggle: 'Umschalten',
    toggleTooltip: (label, state) => `${label}: ${state}`,
    activePreviewTooltip:
      'Nur für LightSource oder HasActivationTexture angezeigt. CanActivate allein hat keinen Texturzustand.',
  },

  // ── Face selector ──────────────────────────────────────────────────────────
  faceSelector: {
    label:           'Texturflächen',
    manageatlas:     'Benutzerdefinierten Atlas verwalten…',
    hint:            'Klicken Sie auf eine Fläche, um ihre Texturkachel zu ändern.',
    hintAllSame:     ' (Alle Flächen teilen dieselbe Kachel)',
    hintGrouped:     ' (3 Gruppen: vorne/hinten · oben/unten · Seiten)',
    hintIndependent: ' (6 unabhängige Flächen)',
    hintActivation:  ' Die inaktive Vorschau verwendet die Kachel direkt rechts (+1), wie der Texturpfad des aktiven Zustands im Engine.',
    hintAnimated:    ' Die animierte Vorschau durchläuft alle 0,5 s eine Reihe von 4 Kacheln.',
  },

  // ── Atlas picker ───────────────────────────────────────────────────────────
  atlasPicker: {
    titlePick:    'Textur auswählen',
    titleManager: 'Benutzerdefinierter Atlas-Manager',
    close:        '✕',
    hintPick:     'Klicken Sie auf eine Kachel zum Auswählen · Escape zum Schließen',
    importAtlasDesc: (px: number, cols: number, rows: number) =>
      `Vollständigen StarMade-Atlas importieren: ${px}×${px} px (${cols}×${rows} Kacheln)`,
    mapDiffuse: 'Diffuser Atlas',
    mapNormal:  'Normalen-Atlas',
    importFull: 'Vollständigen benutzerdefinierten Atlas importieren…',
    importing:  'Importiere…',
    advancedSummary: 'Erweitert: eine Kachel ersetzen',
    slotLabel:  'Slot',
    replaceTile: 'Ausgewählte Kachel ersetzen…',
    reload:      'Texturen neu laden',
    errorImportAtlas: (e: unknown) => `Import des benutzerdefinierten Atlas fehlgeschlagen: ${e}`,
    errorImportTile:  (e: unknown) => `Kachelimport fehlgeschlagen: ${e}`,
  },

  // ── Icon picker ────────────────────────────────────────────────────────────
  iconPicker: {
    title: 'Bau-Icons',
    close: '✕',
    hint:  'Klicken Sie auf ein Icon zum Auswählen · Escape zum Schließen',
  },

  // ── Properties panel — general ─────────────────────────────────────────────
  properties: {
    empty: 'Wählen Sie einen Block aus, um seine Eigenschaften zu bearbeiten.',
    subtitleCustom:  'Benutzerdefinierter Block',
    subtitleVanilla: 'Vanilla-Block',
    vanillaNotice:
      '⚠ Vanilla-Block — Änderungen werden in customBlockConfig/BlockConfigImport.xml gespeichert.',
    badgeCustom:     'Benutzerdefiniert',
    badgeDeprecated: 'Veraltet',
    save:   '💾 Als benutzerdefiniert speichern',
    revert: '↩ Zurücksetzen',
    delete: '🗑 Löschen',
    overrideVanilla:        '✏️ Vanilla überschreiben',
    overrideVanillaTooltip: 'Diesen Vanilla-Block direkt in customBlockConfig/BlockConfigImport.xml schreiben, um tiefes Modding zu ermöglichen.',
        deleteTooltip: (name: string) =>
      `Diesen Block aus customBlockConfig/BlockConfigImport.xml entfernen`,
    deleteConfirm: (name: string) => `Benutzerdefinierten Block ${name} löschen?`,
    importIcon:    'Importieren…',
    importingIcon: 'Importiere…',
    pickIcon:      'Auswählen…',
    pickIconTooltip: 'Bau-Icon auswählen',
    errorImportIcon: (e: unknown) => `Icon-Import fehlgeschlagen: ${e}`,
  },

  // ── Properties panel — section headings ────────────────────────────────────
  section: {
    identity:   'Identität',
    stats:      'Statistiken',
    shape:      'Form',
    rendering:  'Rendering / Textur',
    extra:      'Zusätzliche BlockConfig-Eigenschaften',
    flags:      'Flags',
    lightColor: 'Lichtfarbe',
    variants:   'Varianten',
  },

  // ── Properties panel — field labels & tooltips ─────────────────────────────
  field: {
    name:        { label: 'Name',             tooltip: 'Anzeigename in StarMade-Inventaren, Shop-/Bau-UI und Blocklisten.' },
    icon:        { label: 'Bau-Icon',         tooltip: 'Icon im Bau-Menü. StarMade speichert diese in Icon-Sheets; dieser Picker schreibt den korrekten Sheet-Slot für benutzerdefinierte Icons.' },
    description: { label: 'Beschreibung',     tooltip: 'Beschreibungstext, der Spielern in StarMade-UI/Tooltips angezeigt wird.' },
    hp:          { label: 'TP',               tooltip: 'Trefferpunkte für Schadens-/Zerstörungscode. Höhere Werte machen den Block widerstandsfähiger.' },
    mass:        { label: 'Masse',            tooltip: 'Massebeitrag eines Blocks. Beeinflusst die Schiffs-/Stationsmasse und damit Bewegung und Handhabung.' },
    volume:      { label: 'Volumen',          tooltip: 'Volumenswert für Ausgleichs- und Statistiksysteme dieses Blocktyps.' },
    price:       { label: 'Preis',            tooltip: 'Basispreis im Shop/der Wirtschaft, wenn der Block zum Handel verfügbar ist.' },
    armor:       { label: 'Rüstungswert',     tooltip: 'Allgemeiner Rüstungs-/Widerstandsfaktor für StarMade-Schadensberechnungen.' },
    effectArmor: { label: 'Effekt-Rüstung',  tooltip: 'Rüstungsmodifikatoren pro Schadenstyp. Enthüllt Hitze-, Kinetik- und EM-Widerstände über EffectArmor.' },
    blockStyle:  { label: 'Blockstil',        tooltip: 'Netzform, ausgewählt durch BlockStyle: Würfel, Keil, Ecke, Kreuz, Tetra, Penta usw.' },
    slab:        { label: 'Plattengeometrie', tooltip: 'Vertikale Plattendicke im Engine: ganzer Block, 3/4, 1/2 oder 1/4 Block.' },
    individualSides: { label: 'Texturflächenmodus', tooltip: 'Wie Textur-IDs interpretiert werden: eine Textur für alle Flächen, gruppierte Flächen oder sechs unabhängige Texturflächen.' },
    computerRef: { label: 'Computer-Referenz',    tooltip: 'Optionaler verknüpfter Controller-/Computerblock für Systemblöcke, die auf einen Steuerblock verweisen.' },
    lodShapeFromFar: { label: 'Fernmodell (LOD)',  tooltip: 'LOD-Netz bei Entfernung. StarMade wechselt beim Rendern entfernter Blöcke zu dieser niedrig aufgelösten Darstellung.' },
    lightColor:  { label: 'Farbe',           tooltip: 'Von einer aktiven Lichtquelle emittierte RGB-Farbe. StarMade liest dies als direktes RGB, nicht HSL.' },
    lightRGBI:   { label: 'R G B Intensität',tooltip: 'LightSourceColor-Werte. RGB sind Farbkanäle; der vierte Wert ist der W-Intensitätsmultiplikator für das Engine-Lighting.' },
    slabIds:     { label: 'Plattenvarianten', tooltip: 'Links zu den Plattenvarianten dieses Blocks. StarMade nutzt diese Zuordnungen zur Navigation verwandter Plattenformen.' },
    styleIds:    { label: 'Stilvarianten',    tooltip: 'Links zu alternativen Stil-/Formvarianten dieses Blocks.' },
    emissiveIntensity: 'Emissionsintensität',
  },

  // ── Properties panel — flags ────────────────────────────────────────────────
  flag: {
    sideTexturesPointToOrientation: { label: 'Texturen folgen Ausrichtung', tooltip: 'Dreht die seitliche Textursuche mit der Blockausrichtung. Für orientierte/Schienen-Blöcke, damit Flächen nach Drehung die erwartete Textur behalten.' },
    hasActivationTexture:           { label: 'Aktivierungstextur',          tooltip: 'Aktiviert aktiv/inaktiv-Texturwechsel. Im inaktiven Zustand wird die Kachel direkt rechts neben der Basistextur verwendet.' },
    extendedTexture4x4:             { label: 'Erweiterte 4×4-Textur',       tooltip: 'Verwendet einen erweiterten 4×4-Texturabdruck statt einer einzelnen Kachel für Blöcke, die größere Texturbereiche benötigen.' },
    onlyDrawnInBuildMode:           { label: 'Nur im Baumodus',             tooltip: 'Wird nur in Bau-/Bearbeitungskontexten gerendert; für Hilfs-/Vorschau-Blöcke, die normal nicht gerendert werden sollen.' },
    isPlacable:     { label: 'Platzierbar',      tooltip: 'Ob der Block von Spielern platziert werden kann.' },
    inShop:         { label: 'Im Shop',          tooltip: 'Ob der Block in Shops verkauft wird.' },
    hasOrientation: { label: 'Hat Ausrichtung',  tooltip: 'Ob der Block die Platzierungsausrichtung speichert.' },
    canActivate:    { label: 'Aktivierbar',      tooltip: 'Ob der Block von Spielern ein-/ausgeschaltet werden kann (Gameplay-Interaktion, beeinflusst nicht die Textur).' },
    isDeprecated:   { label: 'Veraltet',         tooltip: 'Markiert den Block als veraltet für Spiel-/UI-Systeme, behält aber XML-Kompatibilität.' },
    lightSource:    { label: 'Lichtquelle',      tooltip: 'Ob der Block im aktiven Zustand Licht aussendet.' },
    transparency:   { label: 'Transparenz',      tooltip: 'Aktiviert transparentes/gemischtes Rendering.' },
    door:           { label: 'Tür',              tooltip: 'Tür-Verhaltens-Flag für Öffnungs-/Schließsysteme.' },
    logicBlock:     { label: 'Logikblock',       tooltip: 'Ob der Block am Logiknetzwerk teilnimmt.' },
    animated:       { label: 'Animiert',         tooltip: 'Wenn wahr, durchläuft die Blocktextur alle ~0,5 s einen Bereich von 4 Kacheln.' },
  },

  // ── Variant selector ────────────────────────────────────────────────────────
  variant: {
    add:     '+ Variante hinzufügen…',
    none:    'Keine Varianten',
    remove:  '× (entfernen)',
    unknown: 'Unbekannter Block',
  },

  // ── Advanced properties editor ─────────────────────────────────────────────
  advanced: {
    searchPlaceholder: (n: number) => `${n} Eigenschaft${n === 1 ? '' : 'en'} durchsuchen…`,
    clear:        'Löschen',
    noProperties: 'Keine zusätzlichen BlockConfig-Eigenschaften.',
    noMatch:      (q: string) => `Keine Eigenschaft entspricht „${q}".`,

    recipeTitle:    'Rezeptbeteiligung',
    recipeDesc:     'Steuert, ob StarMade diesen Block in Rezept- und Produktionssysteme einbezieht. Deaktivierte Blöcke behalten ihre Daten, werden aber von Rezepten ignoriert.',
    inRecipe:       'Im Rezept',
    recipeInactive: 'Rezeptfelder sind inaktiv, weil InRecipe falsch ist.',
    resourceCategory: 'Ressourcenkategorie',
    buyResources:     'Kaufrezept-Ressourcen',
    addBuyResource:   '+ Kaufressource hinzufügen',
    materialReqs:     'Materialanforderungen',
    addMaterial:      '+ Material hinzufügen',
    cubatomTitle:     'Cubatom-Konsistenz',
    cubatomSpec:      'spezialisiert',
    addCubatom:       '+ Cubatom-Material hinzufügen',
    noResources:      'Keine Ressourcen.',

    producedIn:       'Produziert in',
    basicFactory:     'Basisressourcen-Fabrik',
    bakeTime:         'Backzeit',
    factorySlot:      'Fabrik-Slot',
    factoryNone:      'Keiner',
    factoryInput:     'Eingang',
    factoryOutput:    'Ausgang',

    generalChamber:   'Allgemeine Kammer',
    capacity:         'Kapazität',
    rootChamber:      'Stammkammer',
    parentChamber:    'Elternkammer',
    upgradesTo:       'Upgrade auf',
    permission:       'Berechtigung',
    configGroups:     'Konfigurationsgruppen',
    addGroup:         '+ Gruppe hinzufügen',

    controlledBy:    'Gesteuert von',
    controls:        'Steuert',
    addControlledBy: '+ Controller hinzufügen',
    addControls:     '+ Gesteuerter Block hinzufügen',

    defaultCollision:   'Standardkollision',
    astronautCollision: 'Astronauten-Kollision',
    collisionTooltip:   'Kollisionsform. Der Blocktyp verwendet einen benannten Blockstil mit Plattendicke; die konvexe Hülle verwendet eine benannte Netzressource.',
    collisionNone:      'Keine',
    collisionBlockType: 'Blockstil',
    collisionConvex:    'Konvexe Hülle',
    collisionMeshPlaceholder: 'Name des Kollisionsnetzes',

    defaultLod:  'Standard-LOD-Modell',
    activeLod:   'Aktives LOD-Modell',
    activationLodBehavior: 'LOD-Aktivierungsverhalten',

    resourceInjection:   'Ressourceninjektion',
    explosionAbsorption: 'Explosionsabsorption',
  },

  // ── Property option labels ─────────────────────────────────────────────────
  options: {
    indSides: {
      allSame:     'Alle Flächen — gleiche Kachel',
      grouped:     'Gruppierte Flächen: vorne/hinten · oben/unten · Seiten',
      independent: 'Jede Fläche unabhängig',
    },
    slab: {
      full: 'Ganzer Block',
      s34:  '3/4-Platte',
      s12:  '1/2-Platte',
      s14:  '1/4-Platte',
    },
    resourceType: {
      ore:          'Erz',
      plant:        'Pflanze',
      basicResource:'Basisressource',
      cubatom:      'Cubatom-spaltbar',
      manufactory:  'Manufaktur',
      advanced:     'Fortgeschritten',
      capsule:      'Kapsel',
    },
    factory: {
      none:             'Keine',
      capsuleRefinery:  'Kapselraffinerie',
      microAssembler:   'Micro-Assembler',
      componentFactory: 'Komponentenfabrik',
      blockAssembler:   'Block-Assembler',
      chemicalFactory:  'Chemische Fabrik',
    },
    resourceInjection: {
      off:   'Aus',
      ore:   'Erz / Terrain-Ressource',
      flora: 'Flora-Ressource',
    },
    lodAnimation: {
      noSwitch:  'Kein aktiver LOD-Wechsel',
      useActive: 'Aktives LOD-Form bei Aktivierung verwenden',
    },
  },

  // ── Geometry / block style names ───────────────────────────────────────────
  blockStyle: {
    cube:   'Würfel',
    wedge:  'Keil',
    corner: 'Ecke',
    cross:  'Kreuz',
    tetra:  'Tetra',
    penta:  'Penta',
    hepta:  'Hepta',
    style:  (n: number) => `Stil ${n}`,
  },

  // ── Extra property tooltips ────────────────────────────────────────────────
  extraTooltip: {
    Consistence:     'Handwerks-/Materialanforderungen. StarMade liest Item-Einträge mit Anzahl und Block-/Ressourcentyp.',
    CubatomConsistence: 'Spezielle Materialliste für Cubatom-/Kapselspaltlogik. Für normale Blöcke meist leer.',
    InRecipe:        'Steuert, ob StarMade diesen Block in Rezept-/Produktionssysteme einbezieht.',
    RecipeBuyResource:'Zusätzliche Ressourcen für Kauf-/Herstellungsrezepte.',
    BlockResourceType:'Wirtschafts-/Ressourcenkategorie zur Gruppierung von Erzen, Pflanzen, Basisressourcen, Manufaktur-Outputs, Fortgeschrittenen Teilen und Kapseln.',
    ProducedInFactory:'Fabrikstufe/-kategorie, die diesen Block produzieren kann.',
    BasicResourceFactory:'Fabrik-/Ressourcenblock für die Basisressourcenproduktion.',
    FactoryBakeTime: 'Produktionszeit (in Spielticks) für die Fabrikpipeline.',
    Factory:         'Markiert die Fabrik-Slot-Rolle dieses Blocks — typischerweise EINGANG (Ressourcenslot) oder AUSGANG (Produktslot).',
    GeneralChamber:  'Markiert eine Reaktorkammer als allgemeine/stammfähige Kammer im Reaktorsystem.',
    ChamberCapacity: 'Kapazitätsbeitrag dieser Kammer zum Reaktor.',
    ChamberRoot:     'Stammkammer, zu der diese Kammer im Upgrade-Baum gehört.',
    ChamberParent:   'Übergeordnete Kammer, die vor dieser installiert sein muss.',
    ChamberUpgradesTo:'Kammer, die nach Installation dieser Kammer verfügbar wird.',
    ChamberPermission:'Berechtigungs-/Zugriffsstufen-Flag für das Kammersystem.',
    ChamberAppliesTo: 'Blocktypen oder Kammerziele, auf die dieser Kammereffekt angewendet wird.',
    ChamberPrerequisites:'Kammern, die vorhanden sein müssen, bevor diese verfügbar ist.',
    ChamberMutuallyExclusive:'Kammern, die nicht zusammen mit dieser installiert werden können.',
    ChamberChildren: 'Untergeordnete Kammern im Upgrade-Baum, der von dieser Kammer abzweigt.',
    ChamberConfigGroups:'Benannte Konfigurationsgruppen für die Reaktor-UI.',
    ControlledBy:    'XML-Typnamen der Controller-Blöcke, die diesen Block steuern können.',
    Controlling:     'XML-Typnamen der Blöcke, die dieser Controller-Block steuern kann.',
    MainCombinationController:   'Markiert diesen Block als Haupt-Controller in einem Controller/Support/Effekt-Kombinationssystem.',
    SupportCombinationController:'Markiert diesen Block als Support-Controller im Kombinationssystem.',
    EffectCombinationController: 'Markiert diesen Block als Effekt-Controller (Ausgang) im Kombinationssystem.',
    Physical:        'Ob der Block als physisches/kollisionsfähiges Objekt im Physik-Engine teilnimmt.',
    CollisionDefault:'Standard-Kollisionsform. Unterstützt Keine, eine Blockstil-Form mit Plattendicke oder ein konvexes Hüllennetz.',
    CubeCubeCollision:'Verwendet einfache achsenausgerichtete Würfel-gegen-Würfel-Kollision statt eines detaillierten Netzes.',
    UseDetailedCollisionForAstronautMode:'Aktiviert die detaillierte Kollisionsform im Astronautenmodus (Gehen).',
    DetailedCollisionForAstronautMode:'Detaillierte Kollisionsform im Astronautenmodus; typischerweise ein konvexes Hüllennetz für nicht-würfelförmige Blöcke.',
    LodCollisionPhysical:'Ob LOD-reduzierte Geometrie physische/Kollisionseigenschaften behält.',
    Enterable:       'Ob eine Entität oder ein Spieler in das Blockvolumen eintreten oder es besetzen kann.',
    LodShape:        'Niedrig aufgelöster Netz-Ressourcenname bei LOD-Rendering in der Ferne.',
    LodShapeSwitchStyleActive:'Aktiv-Zustand-LOD-Netz; aktiviert wenn der Block aktiv ist und LodActivationAnimationStyle = 1.',
    LodActivationAnimationStyle:'LOD-Aktivierungsübergangsmodus. 0 = kein Wechsel; 1 = aktives LOD-Netz bei aktiven Block.',
    SensorInput:     'Ermöglicht diesem Block, als Sensor-/Eingabeknoten im Logiknetzwerk zu fungieren.',
    DrawLogicConnection:'Zeichnet sichtbare Draht-/Verbindungslinien zwischen diesem Block und verbundenen Logikblöcken.',
    LogicSignaledByRail:'Erlaubt Schienen-/Aktivierungsschienensignalen, den Logikzustand dieses Blocks zu steuern.',
    LogicBlockButton: 'Behandelt diesen Block als Momenttaster-Eingang im Logiksystem.',
    Beacon:          'Markiert diesen Block als Leuchtfeuer — sichtbar auf Scannern und Navigationsüberlagerungen.',
    ResourceInjection:'Ressourceninjektionsmodus für die Weltgenerierung. Aus = keine Injektion; 1 = Erz/Terrain; 2 = Flora.',
    ExplosionAbsorbtion:'Explosionsenergie-Absorptionsfaktor im Schadenssystem (0,0–1,0+).',
    StructureHPContribution:'Zusätzliche Struktur-Trefferpunkte, die dieser Block zum Schiffs-/Stationsrumpf beiträgt.',
    SourceReference:  'Verweist auf einen anderen Block oder Systemeintrag als Quelle/Elternteil dieses Blocks.',
    ReactorHp:       'Trefferpunktbeitrag oder -kapazität dieses Blocks für das Reaktorsystem.',
    ReactorGeneralIconIndex:'Icon-Index für die Reaktor-/Kammer-Konfigurations-UI.',
    LowHpSetting:    'Verhaltensschwelle oder -einstellung bei niedrigen Struktur-Trefferpunkten.',
    OldHitpoints:    'Veralteter Trefferpunktwert für Spielstand-Kompatibilität und Migration.',
    SystemBlock:     'Markiert diesen Block als Teil einer Schiffs-/Stationssystemgruppe (Waffen, Schilde, Triebwerke usw.).',
    InventoryGroup:  'Kategorie/Gruppe für Sortierung und Anzeige im Bau-/Inventarmenü.',
    FullName:        'Langer Anzeigename in einigen Spielkontext-UIs.',
    WildcardIds:     'Alternative Block-IDs oder XML-Typnamen, die von bestimmten Spielsystemen als äquivalent akzeptiert werden.',
    _fallback: (key: string) =>
      `${key} aus BlockConfig.xml. Dieses Feld wird gespeichert und für StarMade-Kompatibilität zurückgeschrieben.`,
  },

  // ── Extra property group titles ──
  groupTitle: {
    resources:   'Ressourcen / Rezepte',
    factory:     'Fabrik / Produktion',
    chambers:    'Kammern',
    controllers: 'Controller',
    collision:   'Kollision / Physik',
    lod:         'LOD / Netz',
    logic:       'Logik / Gameplay',
    reactor:     'Reaktor / Struktur',
    inventory:   'Inventar / Metadaten',
    other:       'Sonstiges',
  },

  // ── Face labels ──
  face: {
    front:  'VORNE',
    back:   'HINTEN',
    top:    'OBEN',
    bottom: 'UNTEN',
    right:  'RECHTS',
    left:   'LINKS',
  },

  // ── Generic None option ──
  none: 'Keiner',

};

export default de;
