# StarMade Block Editor — ユーザーガイド

このガイドでは、StarMade Block Editor の起動、設定、ブロック選択、編集、テクスチャ、アイコン、保存方法を説明します。

---

## 1. アプリの目的

StarMade Block Editor は、StarMade のブロック定義を視覚的に編集するためのローカル Web アプリです。

構成は次の 2 つです。

- StarMade ファイルを読み書きする **サーバー**
- ブロック一覧、3D プレビュー、テクスチャ/アイコン選択、プロパティ編集を行う **ブラウザ UI**

production モードでは次の URL で利用できます。

```text
http://localhost:3847
```

このエディタは StarMade の vanilla データを読み込みますが、保存時は custom override として書き込みます。これにより、ゲーム本体の元ファイルを直接変更せずに編集できます。

---

## 2. アプリの起動

### Windows

```bat
start.bat
```

### Linux / macOS / WSL

```bash
./start.sh
```

起動スクリプトは Node.js/npm を確認し、必要なら依存関係をインストールし、`dist` が無い場合はビルドし、サーバーを起動してブラウザを開きます。

再ビルドを強制する場合：

```bash
./start.sh --rebuild
```

```bat
start.bat --rebuild
```

---

## 3. 初回設定

初回起動時に StarMade のインストールフォルダを指定します。

例：

```text
D:\Jeux\Steam\steamapps\common\StarMade\
```

```text
/mnt/d/Jeux/Steam/steamapps/common/StarMade/
```

サーバーは次のようなファイルを探してフォルダを検証します。

```text
data/config/BlockConfig.xml
```

WSL 上で実行している場合、Windows パスは自動的に `/mnt/<drive>/...` 形式へ変換されます。

ローカル設定は次のファイルに保存されます。

```text
SMToolConfig.json
```

---

## 4. メイン画面

画面は 3 つの列で構成されています。

```text
サイドバー | 3D ビューア | プロパティ
```

### サイドバー

サイドバーでは次の操作ができます。

- 名前、XML type、ID で検索
- vanilla ブロックの表示/非表示
- custom ブロックの表示/非表示
- deprecated ブロックの表示/非表示
- 編集するブロックの選択

### 3D ビューア

選択したブロックを StarMade 風のジオメトリと atlas mapping で表示します。

できること：

- カメラの回転、ズーム、移動
- ブロック orientation の変更
- active/inactive 状態の切り替え
- ライトのプレビュー
- テクスチャ編集する面の選択

### プロパティパネル

選択中ブロックの draft を編集します。

- identity、名前、説明、アイコン
- hitpoints、mass、volume、price、armor
- shape、orientation、slab、variants
- rendering と texture の設定
- gameplay / logic / shop / deprecated flags
- light color と intensity
- advanced BlockConfig properties

---

## 5. 編集フロー

1. サイドバーからブロックを選択します。
2. ブロックが 3D ビューアに表示されます。
3. プロパティパネルに編集用 draft が作成されます。
4. フィールド、テクスチャ、アイコン、advanced properties を変更します。
5. 保存します。
6. サーバーが custom データを書き込み、ブロックを再読み込みします。

重要：vanilla ブロックを編集しても vanilla ファイルは直接変更されません。保存時に custom override が作成されます。

---

## 6. 保存と custom ブロック

保存時の動作：

- vanilla ブロックは custom override になります。
- 既存 custom ブロックは更新されます。
- 不明な XML properties は可能な限り保持されます。
- UI ではブロックが custom として表示されます。

この仕組みにより、元のゲームデータを安全に保てます。

---

## 7. 新しいブロックを作成

ヘッダーの **New block** ボタンを使用します。

アプリはデフォルト値を持つ custom ブロックを作成し、それを選択してエディタで開きます。

---

## 8. テクスチャ編集

### 面セレクター

3D ビューアの下にある面セレクターは `IndividualSides` によって変わります。

- **1 side:** すべての面が同じテクスチャを使用
- **3 sides:** front/back、top/bottom、left/right のグループ
- **6 sides:** 各面が個別のテクスチャを使用

面をクリックすると atlas picker が開きます。

### Atlas picker

Atlas picker は StarMade の tile を表示します。tile をクリックすると、その ID が選択中の面に割り当てられます。

| Page | Source | IDs |
|---|---|---|
| 0 | `t000.png` | `0–255` |
| 1 | `t001.png` | `256–511` |
| 2 | `t002.png` | `512–767` |
| 3 | `t003.png` | `768–1023` |
| 4–6 | reserved | `1024–1791` |
| 7 | `custom.png` | `1792–2047` |

### Custom atlas manager

Custom atlas manager では次の操作ができます。

- custom atlas 全体のインポート
- custom tile 1 枚の置き換え
- diffuse または normal map の選択

インポート後、atlas cache が更新されます。

---

## 9. アイコン編集

プロパティパネルから icon picker を開きます。

Icon picker は StarMade の icon sheet を表示し、選択した数値 icon ID をブロック draft に書き込みます。

---

## 10. 形状とレンダリングルール

| BlockStyle | Shape |
|---|---|
| 0 | Cube |
| 1 | Wedge |
| 2 | Corner |
| 3 | Cross |
| 4 | Tetra |
| 5 | Penta |
| 6 | Hepta / cube fallback |

重要なルール：

- Cross ブロックは `Transparency` が無効でも texture alpha を使用します。
- animated textures は連続する tile を進みます。
- activation textures は StarMade ルールに従って隣接 tile を使用します。
- slabs は preview の厚みを変えます。
- orientation は非対称形状を回転させます。

---

## 11. ライトプレビュー

`LightSource` が有効なブロックは、active light としてプレビューできます。

`LightSourceColor` は次の形式です。

```text
[r, g, b, intensity]
```

最初の 3 つが色、4 つ目が intensity です。

---

## 12. Advanced properties

BlockConfig には resources、recipes、factories、chambers、controllers、collision、LOD、logic、gameplay 用の特殊なフィールドがあります。

Advanced editor はよく使うフィールドに構造化された UI を提供し、不明なフィールドも保持してデータ損失を防ぎます。

意味が分からない advanced property は変更しないでください。

---

## 13. 言語

ヘッダーの言語セレクターで UI ラベルとヘルプを変更できます。保存される StarMade データには影響しません。

対応言語：英語、フランス語、ドイツ語、スペイン語、ロシア語、日本語。

---

## 14. 推奨される安全な作業手順

1. StarMade の custom ファイルをバックアップします。
2. エディタを起動します。
3. 1 回に 1 ブロックずつ編集します。
4. 保存します。
5. アプリを再読み込みして値を確認します。
6. gameplay に影響する変更は StarMade 内でテストします。

---

## 15. トラブルシューティング

### StarMade フォルダが無効と表示される

指定したパスが次のファイルへ到達できるか確認してください。

```text
data/config/BlockConfig.xml
```

### テクスチャが更新されない

Atlas を開き直す、reload textures ボタンを使う、またはアプリを再起動してください。

### ブラウザが自動で開かない

手動で開いてください。

```text
http://localhost:3847
```

### ビルドに失敗する

```bash
npm install
npm run build
```

その後 `--rebuild` で起動してください。

---

## 16. メンテナー向け

便利なコマンド：

```bash
npm run docs:check
npm test
npm run build
```

技術ドキュメント：

```text
docs/CODEBASE_DOCUMENTATION.md
```
