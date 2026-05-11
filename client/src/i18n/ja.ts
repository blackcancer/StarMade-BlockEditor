/**
 * @fileoverview Japanese (ja) locale strings — 日本語.
 *
 * StarMade Block Editor の日本語完全翻訳。
 * すべてのキーは en.ts の構造に完全に対応しています。
 *
 * 技術用語（LOD、UV、XML 等）は英語のまま表記します。
 * UI テキストは自然な日本語を優先しています。
 *
 * @module i18n/ja
 */

import type { Translations } from './en.js';

const ja: Translations = {

  // ── App shell ──────────────────────────────────────────────────────────────
  app: {
    title:    '⚙ StarMade ブロックエディター',
    subtitle: 'v1.0.0',
    dirValid:   (name: string) => `✓ ${name}`,
    dirInvalid: '⚠ StarMade ディレクトリが未設定',
    blockCount: (n: number) => `${n} 個のブロック`,
    reloadTooltip:   'ブロックをディスクから再読み込み',
    newBlockTooltip: 'カスタムブロックを新規作成',
    reload:   '↺ 再読み込み',
    newBlock: '+ 新規ブロック',
    textureResolution: 'テクスチャ解像度',
    texturePack:       'テクスチャパック',
    language: '言語',
  },

  // ── Config dialog ──────────────────────────────────────────────────────────
  config: {
    title:       '⚙ StarMade ブロックエディター',
    description: 'StarMade のインストールディレクトリのパスを設定して開始してください。',
    placeholder: '例: D:/Games/StarMade/StarMade',
    save:        '保存してブロックを読み込む',
  },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    searchPlaceholder: '🔍 ブロックを検索…',
    filterVanilla:    (n: number) => `バニラ (${n})`,
    filterCustom:     (n: number) => `カスタム (${n})`,
    filterDeprecated: '非推奨',
    loading: 'ブロックを読み込み中…',
    empty:   '検索に一致するブロックがありません。',
    footer:  (vanilla: number, custom: number) => `バニラ: ${vanilla} · カスタム: ${custom}`,
  },

  // ── Viewer column ──────────────────────────────────────────────────────────
  viewer: {
    emptyHint: 'リストからブロックを選択してプレビューしてください。',
    styleBadge: (name: string, index: number) => `${name} (スタイル ${index})`,
    orientation: '向き',
    orientOption: (i: number) => `向き ${i}`,
    prevOrientation: '前の向き',
    nextOrientation: '次の向き',
    activationTexturePreview: 'アクティベーションテクスチャプレビュー',
    lightPreview:  'ライトプレビュー',
    previewOn:  'ON',
    previewOff: 'OFF',
    toggle: '切り替え',
    toggleTooltip: (label, state) => `${label}: ${state}`,
    activePreviewTooltip:
      'LightSource または HasActivationTexture のみ表示されます。CanActivate 単独ではテクスチャ状態はありません。',
  },

  // ── Face selector ──────────────────────────────────────────────────────────
  faceSelector: {
    label:           'テクスチャ面',
    manageatlas:     'カスタムアトラスを管理…',
    hint:            '面をクリックしてテクスチャタイルを変更します。',
    hintAllSame:     ' (全面で同じタイルを共有)',
    hintGrouped:     ' (3グループ: 前後・上下・側面)',
    hintIndependent: ' (6面それぞれ独立)',
    hintActivation:  ' 非アクティブプレビューはエンジンのアクティブ状態テクスチャパスと同様に、右隣のタイル (+1) を使用します。',
    hintAnimated:    ' アニメーションプレビューは 0.5 秒ごとに 4 タイルをサイクルします。',
  },

  // ── Atlas picker ───────────────────────────────────────────────────────────
  atlasPicker: {
    titlePick:    'テクスチャを選択',
    titleManager: 'カスタムアトラスマネージャー',
    close:        '✕',
    hintPick:     'タイルをクリックして選択 · Escape で閉じる',
    importAtlasDesc: (px: number, cols: number, rows: number) =>
      `StarMade カスタムアトラス全体をインポート: ${px}×${px} px (${cols}×${rows} タイル)`,
    mapDiffuse: 'ディフューズアトラス',
    mapNormal:  'ノーマルアトラス',
    importFull: 'カスタムアトラス全体をインポート…',
    importing:  'インポート中…',
    advancedSummary: '詳細: タイルを 1 枚置き換え',
    slotLabel:  'スロット',
    replaceTile: '選択したタイルを置き換え…',
    reload:      'テクスチャを再読み込み',
    errorImportAtlas: (e: unknown) => `カスタムアトラスのインポートに失敗しました: ${e}`,
    errorImportTile:  (e: unknown) => `タイルのインポートに失敗しました: ${e}`,
  },

  // ── Icon picker ────────────────────────────────────────────────────────────
  iconPicker: {
    title: '建築アイコン',
    close: '✕',
    hint:  'アイコンをクリックして選択 · Escape で閉じる',
  },

  // ── Properties panel — general ─────────────────────────────────────────────
  properties: {
    empty: 'ブロックを選択してプロパティを編集してください。',
    subtitleCustom:  'カスタムブロック',
    subtitleVanilla: 'バニラブロック',
    vanillaNotice:
      '⚠ バニラブロック — 変更は customBlockConfig/BlockConfigImport.xml に保存されます。',
    badgeCustom:     'カスタム',
    badgeDeprecated: '非推奨',
    save:   '💾 カスタムとして保存',
    revert: '↩ 元に戻す',
    delete: '🗑 削除',
    overrideVanilla:        '✏️ バニラを上書き',
    overrideVanillaTooltip: 'このバニラブロックを customBlockConfig/BlockConfigImport.xml に直接書き込み、深いモッディングを可能にします。',
        deleteTooltip: (name: string) =>
      `customBlockConfig/BlockConfigImport.xml からこのブロックを削除`,
    deleteConfirm: (name: string) => `カスタムブロック「${name}」を削除しますか？`,
    importIcon:    'インポート…',
    importingIcon: 'インポート中…',
    pickIcon:      '選択…',
    pickIconTooltip: '建築アイコンを選択',
    errorImportIcon: (e: unknown) => `アイコンのインポートに失敗しました: ${e}`,
  },

  // ── Properties panel — section headings ────────────────────────────────────
  section: {
    identity:   '識別情報',
    stats:      'ステータス',
    shape:      '形状',
    rendering:  'レンダリング / テクスチャ',
    extra:      'BlockConfig 追加プロパティ',
    flags:      'フラグ',
    lightColor: 'ライトカラー',
    variants:   'バリアント',
  },

  // ── Properties panel — field labels & tooltips ─────────────────────────────
  field: {
    name:        { label: '名前',             tooltip: 'StarMade のインベントリ、ショップ/建築 UI、ブロックリストに表示される名前。' },
    icon:        { label: '建築アイコン',     tooltip: '建築メニューのアイコン。StarMade はアイコンシートに格納されています。カスタムアイコンの場合、正しいシートスロットに書き込みます。' },
    description: { label: '説明',             tooltip: 'StarMade UI/ツールチップでプレイヤーに表示される説明テキスト。' },
    hp:          { label: 'HP',               tooltip: 'ダメージ/破壊コードで使用されるヒットポイント。値が高いほどブロックが破壊しにくくなります。' },
    mass:        { label: '質量',             tooltip: 'ブロック 1 個の質量への貢献。船/ステーションの質量に影響し、移動と操作性に影響します。' },
    volume:      { label: 'ボリューム',       tooltip: 'このブロックタイプのバランス/統計システムで使用されるボリューム値。' },
    price:       { label: '価格',             tooltip: 'ブロックが取引可能な場合のショップ/経済の基本価格。' },
    armor:       { label: 'アーマー値',       tooltip: 'StarMade のダメージ計算に使用される汎用アーマー/耐性係数。' },
    effectArmor: { label: 'エフェクトアーマー',tooltip: 'ダメージタイプ別アーマー修正値。EffectArmor を通じてヒート、キネティック、EM 耐性を公開します。' },
    blockStyle:  { label: 'ブロックスタイル', tooltip: 'BlockStyle で選択されたメッシュ形状: キューブ、ウェッジ、コーナー、クロス、テトラ、ペンタなど。' },
    slab:        { label: 'スラブ形状',       tooltip: 'エンジンで使用される垂直スラブの厚さ: フルブロック、3/4、1/2、1/4。' },
    individualSides: { label: 'テクスチャ面モード', tooltip: 'テクスチャ ID の解釈方法: 全面に同じテクスチャ、グループ面、または 6 面それぞれ独立。' },
    computerRef: { label: 'コンピューター参照', tooltip: 'システムブロックが制御ブロックを参照するために使用するオプションのコントローラー/コンピューターブロック。' },
    lodShapeFromFar: { label: '遠距離 LOD モデル', tooltip: '遠距離での LOD メッシュ。StarMade は遠くのブロックをレンダリングする際にこの低精細表現に切り替えます。' },
    lightColor:  { label: 'カラー',          tooltip: 'アクティブな光源が放出する RGB カラー。StarMade はこれを HSL ではなく直接 RGB として読み取ります。' },
    lightRGBI:   { label: 'R G B 強度',      tooltip: 'LightSourceColor の値。RGB はカラーチャンネル; 4 番目の値はエンジンライティングで使用される W 強度乗数です。' },
    slabIds:     { label: 'スラブバリアント',  tooltip: 'このブロックのスラブバリアントへのリンク。StarMade はこの関連付けを使用して関連するスラブ形状を移動します。' },
    styleIds:    { label: 'スタイルバリアント',tooltip: 'このブロックに関連する代替スタイル/形状バリアントへのリンク。' },
    emissiveIntensity: '発光強度',
  },

  // ── Properties panel — flags ────────────────────────────────────────────────
  flag: {
    sideTexturesPointToOrientation: { label: 'テクスチャが向きに従う',       tooltip: 'ブロックの向きに合わせて側面テクスチャのルックアップを回転させます。回転後も面が期待するテクスチャを保持するよう、向き付き/レールブロックに使用されます。' },
    hasActivationTexture:           { label: 'アクティベーションテクスチャ',  tooltip: 'アクティブ/非アクティブのテクスチャ切り替えを有効にします。非アクティブ状態では基本テクスチャの直右のタイルが使用されます。' },
    extendedTexture4x4:             { label: '拡張 4×4 テクスチャ',          tooltip: 'より大きなテクスチャ領域が必要なブロックに対して、単一タイルの代わりに 4×4 の拡張テクスチャフットプリントを使用します。' },
    onlyDrawnInBuildMode:           { label: '建築モードのみ表示',            tooltip: '建築/編集コンテキストのみでレンダリングされます。通常はレンダリングしないヘルパー/プレビューブロックに使用されます。' },
    isPlacable:     { label: '設置可能',           tooltip: 'プレイヤーがブロックを設置できるかどうか。' },
    inShop:         { label: 'ショップに掲載',     tooltip: 'ブロックがショップで販売されるかどうか。' },
    hasOrientation: { label: '向きあり',           tooltip: 'ブロックが設置時の向きを保存するかどうか。' },
    canActivate:    { label: 'アクティベート可能', tooltip: 'プレイヤーがブロックをオン/オフできるかどうか (ゲームプレイのインタラクション、テクスチャには影響しません)。' },
    isDeprecated:   { label: '非推奨',             tooltip: 'XML の互換性を保ちつつ、ゲーム/UI システムでブロックを非推奨としてマークします。' },
    lightSource:    { label: '光源',               tooltip: 'アクティブ時にブロックが光を放出するかどうか。' },
    transparency:   { label: '透明度',             tooltip: '透明/ブレンドレンダリングを有効にします。' },
    door:           { label: 'ドア',               tooltip: '開閉システムで使用されるドアタイプの動作フラグ。' },
    logicBlock:     { label: 'ロジックブロック',   tooltip: 'ブロックがロジックネットワークに参加するかどうか。' },
    animated:       { label: 'アニメーション',     tooltip: '真の場合、ブロックのテクスチャは約 0.5 秒ごとに 4 タイルのサイクルを行います。' },
  },

  // ── Variant selector ────────────────────────────────────────────────────────
  variant: {
    add:     '+ バリアントを追加…',
    none:    'バリアントなし',
    remove:  '× (削除)',
    unknown: '不明なブロック',
  },

  // ── Advanced properties editor ─────────────────────────────────────────────
  advanced: {
    searchPlaceholder: (n: number) => `${n} 個のプロパティを検索…`,
    clear:        'クリア',
    noProperties: 'BlockConfig の追加プロパティはありません。',
    noMatch:      (q: string) => `「${q}」に一致するプロパティはありません。`,

    recipeTitle:    'レシピへの参加',
    recipeDesc:     'StarMade がこのブロックをレシピと製造システムに含めるかどうかを制御します。無効化されたブロックはデータを保持しますが、レシピには無視されます。',
    inRecipe:       'レシピに含める',
    recipeInactive: 'InRecipe が false のため、レシピフィールドは無効です。',
    resourceCategory: 'リソースカテゴリ',
    buyResources:     '購入レシピリソース',
    addBuyResource:   '+ 購入リソースを追加',
    materialReqs:     '素材要件',
    addMaterial:      '+ 素材を追加',
    cubatomTitle:     'キュバトム組成',
    cubatomSpec:      '特殊',
    addCubatom:       '+ キュバトム素材を追加',
    noResources:      'リソースがありません。',

    producedIn:       '製造場所',
    basicFactory:     '基本リソース工場',
    bakeTime:         '製造時間',
    factorySlot:      '工場スロット',
    factoryNone:      'なし',
    factoryInput:     '入力',
    factoryOutput:    '出力',

    generalChamber:   '汎用チャンバー',
    capacity:         '容量',
    rootChamber:      'ルートチャンバー',
    parentChamber:    '親チャンバー',
    upgradesTo:       'アップグレード先',
    permission:       '権限',
    configGroups:     '設定グループ',
    addGroup:         '+ グループを追加',

    controlledBy:    '制御元',
    controls:        '制御対象',
    addControlledBy: '+ コントローラーを追加',
    addControls:     '+ 制御ブロックを追加',

    defaultCollision:   'デフォルト衝突形状',
    astronautCollision: '宇宙服モード衝突形状',
    collisionTooltip:   '衝突形状。ブロックタイプはスラブの厚さを持つ名前付きブロックスタイルを使用し、凸包は名前付きメッシュリソースを使用します。',
    collisionNone:      'なし',
    collisionBlockType: 'ブロックスタイル',
    collisionConvex:    '凸包メッシュ',
    collisionMeshPlaceholder: '衝突メッシュ名',

    defaultLod:  'デフォルト LOD モデル',
    activeLod:   'アクティブ LOD モデル',
    activationLodBehavior: 'LOD アクティベーション動作',

    resourceInjection:   'リソース注入',
    explosionAbsorption: '爆発吸収',
  },

  // ── Property option labels ─────────────────────────────────────────────────
  options: {
    indSides: {
      allSame:     '全面同一タイル',
      grouped:     'グループ面: 前後・上下・側面',
      independent: '各面独立',
    },
    slab: {
      full: 'フルブロック',
      s34:  '3/4 スラブ',
      s12:  '1/2 スラブ',
      s14:  '1/4 スラブ',
    },
    resourceType: {
      ore:          '鉱石',
      plant:        '植物',
      basicResource:'基本リソース',
      cubatom:      'キュバトム分割可',
      manufactory:  'マニュファクトリー',
      advanced:     '高度',
      capsule:      'カプセル',
    },
    factory: {
      none:             'なし',
      capsuleRefinery:  'カプセル精製所',
      microAssembler:   'マイクロアセンブラー',
      componentFactory: 'コンポーネント工場',
      blockAssembler:   'ブロックアセンブラー',
      chemicalFactory:  '化学工場',
    },
    resourceInjection: {
      off:   'オフ',
      ore:   '鉱石 / 地形リソース',
      flora: '植生リソース',
    },
    lodAnimation: {
      noSwitch:  'アクティブ LOD 切り替えなし',
      useActive: 'アクティブ時にアクティブ LOD 形状を使用',
    },
  },

  // ── Geometry / block style names ───────────────────────────────────────────
  blockStyle: {
    cube:   'キューブ',
    wedge:  'ウェッジ',
    corner: 'コーナー',
    cross:  'クロス',
    tetra:  'テトラ',
    penta:  'ペンタ',
    hepta:  'ヘプタ',
    style:  (n: number) => `スタイル ${n}`,
  },

  // ── Extra property tooltips ────────────────────────────────────────────────
  extraTooltip: {
    Consistence:     'クラフト/素材要件。StarMade はカウントとブロック/リソースタイプを持つ Item エントリを読み取ります。',
    CubatomConsistence: 'キュバトム/カプセル分割ロジックに使用される特殊素材リスト。通常のブロックでは通常空です。',
    InRecipe:        'StarMade がこのブロックをレシピ/製造システムに含めるかどうかを制御します。',
    RecipeBuyResource:'購入/クラフトレシピで消費される追加リソース。',
    BlockResourceType:'鉱石、植物、基本リソース、マニュファクトリー出力、高度パーツ、カプセルをグループ化するための経済/リソースカテゴリ。',
    ProducedInFactory:'このブロックを製造できる工場の段階/カテゴリ。',
    BasicResourceFactory:'基本リソース生産に関連する工場/リソースブロック。',
    FactoryBakeTime: '工場パイプラインで使用される生産時間 (ゲームティック単位)。',
    Factory:         'このブロックの工場スロットの役割をマーク — 通常は INPUT (リソーススロット) または OUTPUT (製品スロット)。',
    GeneralChamber:  'リアクターチャンバーをリアクターシステムの汎用/ルート対応チャンバーとしてマークします。',
    ChamberCapacity: 'このチャンバーがリアクターに提供する容量の貢献。',
    ChamberRoot:     'アップグレードツリーでこのチャンバーが属するルートチャンバー。',
    ChamberParent:   'このチャンバーをインストールする前に必要な親チャンバー。',
    ChamberUpgradesTo:'このチャンバーをインストールした後に利用可能になるチャンバー。',
    ChamberPermission:'チャンバーシステムの権限/アクセスレベルフラグ。',
    ChamberAppliesTo: 'このチャンバー効果が適用されるブロックタイプまたはチャンバーターゲット。',
    ChamberPrerequisites:'このチャンバーが利用可能になる前に存在している必要があるチャンバーのリスト。',
    ChamberMutuallyExclusive:'このチャンバーと同時に組み合わせ/インストールできないチャンバー。',
    ChamberChildren: 'このチャンバーから分岐するアップグレードツリーの子チャンバー。',
    ChamberConfigGroups:'リアクター UI が関連するチャンバーをグループ化するために使用する名前付き設定グループ。',
    ControlledBy:    'このブロックを制御できるコントローラーブロックの XML タイプ名。',
    Controlling:     'このコントローラーブロックが制御できるブロックの XML タイプ名。',
    MainCombinationController:   'コントローラー/サポート/エフェクトコンビネーションシステムのメインコントローラーとしてこのブロックをマークします。',
    SupportCombinationController:'コンビネーションシステムのサポートコントローラーとしてこのブロックをマークします。',
    EffectCombinationController: 'コンビネーションシステムのエフェクトコントローラー (出力) としてこのブロックをマークします。',
    Physical:        'ブロックが物理エンジンで物理/衝突オブジェクトとして参加するかどうか。',
    CollisionDefault:'デフォルトの衝突形状。なし、スラブの厚さを持つブロックスタイル形状、または名前付き凸包をサポートします。',
    CubeCubeCollision:'詳細メッシュの代わりに軸整列されたキューブ対キューブ衝突を使用します。',
    UseDetailedCollisionForAstronautMode:'プレイヤーが宇宙服 (歩行) モードにいるときに詳細衝突形状を有効にします。',
    DetailedCollisionForAstronautMode:'宇宙服モードで使用される詳細衝突形状。非キューブブロック形状には通常、凸包メッシュが使用されます。',
    LodCollisionPhysical:'LOD で削減されたジオメトリが物理/衝突プロパティを保持するかどうか。',
    Enterable:       'エンティティまたはプレイヤーがブロックのボリュームに入るまたは占有できるかどうか。',
    LodShape:        '遠距離で LOD レンダリングが有効になるときに使用される低精細メッシュリソース名。',
    LodShapeSwitchStyleActive:'アクティブ状態の LOD メッシュ。ブロックがアクティブで LodActivationAnimationStyle = 1 のときに有効。',
    LodActivationAnimationStyle:'LOD アクティベーション遷移モード。0 = 切り替えなし; 1 = ブロックがアクティブなときにアクティブ LOD メッシュに切り替え。',
    SensorInput:     'このブロックがロジックネットワークでセンサー/入力ノードとして機能できるようにします。',
    DrawLogicConnection:'このブロックと接続されたロジックブロック間に可視のワイヤー/接続線を描画します。',
    LogicSignaledByRail:'レール/アクティベーターレールの信号がこのブロックのロジック状態を駆動できるようにします。',
    LogicBlockButton: 'このブロックをロジックシステムの瞬間ボタン入力として扱います。',
    Beacon:          'このブロックをビーコンとしてマーク — スキャナーとナビゲーションオーバーレイに表示されます。',
    ResourceInjection:'ワールド生成のリソース注入モード。オフ = 注入なし; 1 = 鉱石/地形; 2 = 植生。',
    ExplosionAbsorbtion:'ダメージシステムで使用される爆発エネルギー吸収係数 (0.0〜1.0+)。',
    StructureHPContribution:'このブロックが船/ステーションの船体に貢献する追加の構造 HP。',
    SourceReference:  'このブロックのソース/親として別のブロックまたはシステムエントリを参照します。',
    ReactorHp:       'このブロックがリアクターシステムに提供する HP の貢献または容量。',
    ReactorGeneralIconIndex:'リアクター/チャンバー設定 UI で使用されるアイコンインデックス。',
    LowHpSetting:    '構造 HP が重大なレベルを下回ったときに適用される動作のしきい値または設定。',
    OldHitpoints:    'セーブゲームの互換性と移行のために保持されたレガシー HP 値。',
    SystemBlock:     'このブロックを船/ステーションのシステムグループ (武器、シールド、スラスターなど) の一部としてマークします。',
    InventoryGroup:  '建築/インベントリメニューでブロックをソート/表示するためのカテゴリ/グループ。',
    FullName:        '一部のゲーム UI コンテキストで表示される長い表示名。',
    WildcardIds:     '特定のゲームシステムで同等として受け入れられる代替ブロック ID または XML タイプ名。',
    _fallback: (key: string) =>
      `${key} (BlockConfig.xml)。このフィールドは StarMade との互換性のために保持されて保存されます。`,
  },

  // ── Extra property group titles ──
  groupTitle: {
    resources:   'リソース / レシピ',
    factory:     '工場 / 製造',
    chambers:    'チャンバー',
    controllers: 'コントローラー',
    collision:   '衝突 / 物理',
    lod:         'LOD / メッシュ',
    logic:       'ロジック / ゲームプレイ',
    reactor:     'リアクター / 構造',
    inventory:   'インベントリ / メタデータ',
    other:       'その他',
  },

  // ── Face labels ──
  face: {
    front:  '前面',
    back:   '背面',
    top:    '上面',
    bottom: '下面',
    right:  '右面',
    left:   '左面',
  },

  // ── Generic None option ──
  none: 'なし',

};

export default ja;
