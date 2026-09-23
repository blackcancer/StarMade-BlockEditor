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
  mobile: {"navigation": "エディターのパネル", "blocks": "ブロック", "preview": "プレビュー", "properties": "プロパティ"},
  extraLabel: {
    MainCombinationController: "主組み合わせコントローラー",
    SupportCombinationController: "補助組み合わせコントローラー",
    EffectCombinationController: "効果組み合わせコントローラー",
    Physical: "物理衝突",
    CubeCubeCollision: "キューブ同士の衝突",
    LodCollisionPhysical: "LODの物理衝突",
    UseDetailedCollisionForAstronautMode: "宇宙飛行士モードの詳細な衝突",
    Enterable: "進入可能",
    SensorInput: "センサー入力",
    DrawLogicConnection: "論理接続を表示",
    LogicSignaledByRail: "レールの論理信号",
    LogicBlockButton: "瞬間動作の論理ボタン",
    Beacon: "ビーコン",
    StructureHPContribution: "構造耐久値への寄与",
    SourceReference: "参照元",
    ReactorHp: "リアクター耐久値",
    ReactorGeneralIconIndex: "リアクターのアイコン",
    LowHpSetting: "低耐久値の設定",
    OldHitpoints: "旧耐久値",
    SystemBlock: "システムブロック",
    InventoryGroup: "インベントリのグループ",
    FullName: "正式名称",
    WildcardIds: "代替ブロックID",
  },
  errors: {
    textureTile: (value: string) => "テクスチャタイル" + value + "はStarMadeのネイティブアトラスの範囲外です。",
    numberValue: (value: string) => "" + value + "には有限の数値を指定してください。",
    textValue: (value: string) => "" + value + "には文字列を指定してください。",
    booleanValue: (value: string) => "" + value + "には有効または無効を指定してください。",
    technicalDetails: "技術的な詳細",
    unknown: "処理を完了できませんでした。再試行するか、エディターを再読み込みしてください。",
    conflict: "ファイルがエディター外で変更されました。下書きを控えてから「再読み込み」と「元に戻す」を選び、最新の内容を読み込んでから保存してください。",
    reload: "保存する前にブロック一覧を再読み込みしてください。",
    configuration: "設定で既存のStarMadeインストール先を選んでください。",
    configRead: "エディターの設定を読み込み、または保存できませんでした。",
    catalogue: "ブロック一覧を読み込み、または保存できませんでした。インストール先のファイルを確認してください。",
    network: "サーバーに接続できません。接続を確認して再試行してください。",
    permission: "このエディターのセッションでは、この操作は許可されていません。",
    invalidData: "無効な値があります。保存する前に各項目を確認してください。",
    image: "画像を読み込めませんでした。形式とサイズを確認してください。",
    imageMissing: "このインストール先に選択した画像またはアイコンシートがありません。",
    iconBackup: "このスロットの元のアイコンのバックアップがありません。",
    nativeShaders: "このインストール先にStarMadeのシェーダーファイルがありません。",
    nativeTextures: "このパックと解像度のネイティブテクスチャがありません。",
    nativeLod: "ネイティブモデルのファイルがないか、無効です。",
    shader: "ネイティブシェーダーをコンパイルできませんでした。プレビューを再読み込みしてください。",
    context: "グラフィックスの接続が失われました。プレビューを再読み込みしてください。",
    capture: "アイコンを生成できませんでした。プレビューを再読み込みして再試行してください。",
    notFound: "選択したブロックは存在しません。一覧を再読み込みしてください。",
    vanillaDelete: "ゲームの標準ブロックは削除できません。カスタム定義のみ削除できます。",
    noIds: "新しいカスタムブロックに使用できるIDがありません。",
    unsafePath: "要求されたファイルは、許可されたインストール先の範囲外にあります。",
    invalidValue: (value: string) => "" + value + "の値が無効です。",
    imageDimensions: (value: string) => "必要な画像サイズ：" + value + "。",
    animationTile: (value: string) => "タイル" + value + "のアニメーションがアトラスページの範囲を超えています。",
    missingLayer: (value: string) => "選択したインストール先にテクスチャレイヤー" + value + "がありません。",
    missingModel: (value: string) => "ネイティブモデル" + value + "を読み込めませんでした。",
    http: (value: string) => "サーバーからHTTP " + value + "が返されました。再試行するか再読み込みしてください。",
  },
  warnings: {
    missingLayer: (value: string) => "テクスチャレイヤー" + value + "がありません。",
    missingNormal: (value: string) => "マテリアルの法線レイヤー" + value + "がありません。",
    normalAlpha: (value: string) => "法線レイヤー" + value + "にアルファチャンネルがないため、マテリアルのアルファ値を0に設定します。",
    overlay: "ネイティブのオーバーレイテクスチャがありません。",
    lod: "ネイティブLODモデルの定義がありません。",
    unknown: "一部のプレビュー用リソースが利用できません。",
  },


  // ── App shell ──────────────────────────────────────────────────────────────
  app: {
    settings: "設定",
    title:    '⚙ StarMade ブロックエディター',
    subtitle: 'v1.1.0',
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
    directoryLabel: "StarMadeのフォルダー",
    title:       '⚙ StarMade ブロックエディター',
    description: 'StarMade のインストールディレクトリのパスを設定して開始してください。',
    placeholder: '例: D:/Games/StarMade/StarMade',
    save:        '保存してブロックを読み込む',
  },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    discardConfirm: "このブロックの未保存の変更を破棄しますか？",
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
    modelPreview: "アクティブモデルのプレビュー",
    nativeLoading: "StarMade の描画を読み込み中…",
    nativeError: (detail: string) => "3D プレビューを利用できません: " + detail,
    webgl2Required: "このプレビューには WebGL 2 が必要です。",
    nativeWarnings: (detail: string) => "プレビューのリソース: " + detail,
    emptyHint: 'リストからブロックを選択してプレビューしてください。',
    styleBadge: (name: string, index: number) => `${name} (スタイル ${index})`,
    orientation: '向き',
    orientOption: (i: number) => `向き ${i}`,
    prevOrientation: '前の向き',
    nextOrientation: '次の向き',
    activationTexturePreview: 'アクティベーションテクスチャプレビュー',
    lightPreview:  'ライトプレビュー',
    previewOn: '有効',
    previewOff: '無効',
    toggle: '切り替え',
    toggleTooltip: (label, state) => `${label}: ${state}`,
    activePreviewTooltip:
      "ブロックに設定された光源、アクティブ状態のテクスチャと LOD モデルを表示します。",
  },

  // ── Face selector ──────────────────────────────────────────────────────────
  faceSelector: {
    label:           'テクスチャ面',
    manageatlas:     'カスタムアトラスを管理…',
    hint:            '面をクリックしてテクスチャタイルを変更します。',
    hintAllSame:     ' (全面で同じタイルを共有)',
    hintGrouped: "（上面、下面、共通の側面4つ）",
    hintIndependent: ' (6面それぞれ独立)',
    hintActivation:  ' 非アクティブプレビューはエンジンのアクティブ状態テクスチャパスと同様に、右隣のタイル (+1) を使用します。',
    hintAnimated:    " テクスチャのアニメーションは StarMade と同じ動作になります。",
  },

  // ── Atlas picker ───────────────────────────────────────────────────────────
  atlasPicker: {
    closeLabel: "閉じる",
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
    closeLabel: "閉じる",
    title: '建築アイコン',
    close: '✕',
    hint:  'アイコンをクリックして選択 · Escape で閉じる',
  },

  // ── Properties panel — general ─────────────────────────────────────────────
  properties: {
    generateIcon: "ブロックから作成",
    generatingIcon: "作成中…",
    applyGeneratedIcon: "アイコンを適用",
    generatedIconPreview: "作成したアイコンのプレビュー",
    cancelGeneratedIcon: "キャンセル",
    iconWriteNotice: "インポートするとゲームのアイコンが置き換わります。復元用のバックアップが保存されます。",
    restoreIcon: "元のアイコンを復元",
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
    damageHeat: "熱",
    damageKinetic: "運動",
    damageEM: "電磁",
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
    animated:       { label: 'アニメーション',     tooltip: "StarMade と同じフレーム順序とタイミングでテクスチャをアニメーション化します。" },
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
    value: "値",
    count: "個数",
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
      grouped:     "面のグループ：上面・下面・共通の側面4つ",
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
    hepta:  "立方体（24方向）",
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
    ResourceInjection:'ワールド生成のリソース注入モード。オフ = 注入なし; 1 = 鉱石/地形; 17 = 植生。',
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
