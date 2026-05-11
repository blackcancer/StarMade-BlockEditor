# StarMade Block Editor — Benutzerhandbuch

Dieses Handbuch erklärt die Nutzung von StarMade Block Editor: Start, Konfiguration, Blockauswahl, Bearbeitung, Texturen, Icons und Speichern.

---

## 1. Zweck der Anwendung

StarMade Block Editor ist eine lokale Webanwendung zum visuellen Bearbeiten von StarMade-Blockdefinitionen.

Sie besteht aus zwei Teilen:

- einem **Server**, der StarMade-Dateien liest und schreibt;
- einer **Browseroberfläche** mit Blockliste, 3D-Vorschau, Textur-/Icon-Auswahl und Eigenschafteneditor.

Im Produktionsmodus läuft alles unter:

```text
http://localhost:3847
```

Die Anwendung liest Vanilla-StarMade-Daten, speichert Änderungen aber als Custom-Overrides. Dadurch bleiben die originalen Spieldateien unverändert.

---

## 2. Anwendung starten

### Windows

```bat
start.bat
```

### Linux / macOS / WSL

```bash
./start.sh
```

Das Startskript prüft Node.js/npm, installiert fehlende Abhängigkeiten, baut die Anwendung bei Bedarf, startet den Server und öffnet den Browser.

Neu bauen und starten:

```bash
./start.sh --rebuild
```

```bat
start.bat --rebuild
```

---

## 3. Erste Konfiguration

Beim ersten Start muss der StarMade-Installationsordner angegeben werden.

Beispiele:

```text
D:\Jeux\Steam\steamapps\common\StarMade\
```

```text
/mnt/d/Jeux/Steam/steamapps/common/StarMade/
```

Der Server prüft den Ordner unter anderem anhand von:

```text
data/config/BlockConfig.xml
```

Unter WSL werden Windows-Pfade automatisch nach `/mnt/<laufwerk>/...` konvertiert.

Die lokale Konfiguration liegt in:

```text
SMToolConfig.json
```

---

## 4. Oberfläche

Die Oberfläche hat drei Hauptbereiche:

```text
Sidebar | 3D-Vorschau | Eigenschaften
```

### Sidebar

In der Sidebar können Sie:

- nach Name, XML-Typ oder ID suchen;
- Vanilla-Blöcke ein-/ausblenden;
- Custom-Blöcke ein-/ausblenden;
- veraltete Blöcke ein-/ausblenden;
- einen Block zur Bearbeitung auswählen.

### 3D-Vorschau

Die Vorschau zeigt den ausgewählten Block mit StarMade-Geometrie und Atlas-Mapping.

Sie können:

- Kamera drehen, zoomen und verschieben;
- die Orientierung ändern;
- den aktiven/inaktiven Zustand testen;
- Lichtquellen anzeigen;
- eine Fläche für Texturbearbeitung auswählen.

### Eigenschaften

Der Eigenschaftenbereich bearbeitet den aktuellen Blockentwurf:

- Identität, Name, Beschreibung und Icon;
- Hitpoints, Masse, Volumen, Preis und Panzerung;
- Form, Orientierung, Slab und Varianten;
- Rendering- und Texturoptionen;
- Gameplay-, Logik-, Shop- und Deprecated-Flags;
- Lichtfarbe und Intensität;
- erweiterte BlockConfig-Eigenschaften.

---

## 5. Bearbeitungsablauf

1. Wählen Sie einen Block in der Sidebar.
2. Der Block erscheint in der 3D-Vorschau.
3. Der Eigenschaftenbereich erstellt einen bearbeitbaren Entwurf.
4. Ändern Sie Felder, Texturen, Icon oder erweiterte Eigenschaften.
5. Speichern Sie.
6. Der Server schreibt die Custom-Daten und lädt den Block neu.

Wichtig: Ein Vanilla-Block wird beim Speichern nicht direkt in der Vanilla-Datei verändert. Er wird als Custom-Override gespeichert.

---

## 6. Speichern und Custom-Blöcke

Beim Speichern gilt:

- Vanilla-Blöcke werden zu Custom-Overrides;
- bestehende Custom-Blöcke werden aktualisiert;
- unbekannte XML-Eigenschaften werden soweit möglich erhalten;
- die Oberfläche markiert den Block als Custom.

Dieses Verhalten schützt die originalen Spieldaten.

---

## 7. Neuen Block erstellen

Klicken Sie im Header auf **New block**.

Die Anwendung erstellt einen neuen Custom-Block mit Standardwerten, wählt ihn aus und öffnet ihn im Editor.

---

## 8. Texturen bearbeiten

### Flächenauswahl

Unter der 3D-Vorschau befinden sich die Texturflächen. Sie hängen von `IndividualSides` ab:

- **1 Seite:** alle Flächen verwenden dieselbe Textur;
- **3 Seiten:** Gruppen front/back, top/bottom, left/right;
- **6 Seiten:** jede Fläche hat eine eigene Textur.

Klicken Sie auf eine Fläche, um den Atlas zu öffnen.

### Atlas

Der Atlas zeigt die StarMade-Kacheln. Ein Klick weist der ausgewählten Fläche die Tile-ID zu.

| Page | Quelle | IDs |
|---|---|---|
| 0 | `t000.png` | `0–255` |
| 1 | `t001.png` | `256–511` |
| 2 | `t002.png` | `512–767` |
| 3 | `t003.png` | `768–1023` |
| 4–6 | reserviert | `1024–1791` |
| 7 | `custom.png` | `1792–2047` |

### Custom-Atlas-Manager

Der Manager ermöglicht:

- vollständigen Custom-Atlas importieren;
- einzelne Custom-Kachel ersetzen;
- diffuse oder normal map auswählen.

Nach einem Import werden Atlas-Caches aktualisiert.

---

## 9. Icons bearbeiten

Öffnen Sie den Icon-Picker im Eigenschaftenbereich.

Der Picker zeigt StarMade-Icon-Sheets und schreibt die numerische Icon-ID in den Blockentwurf.

---

## 10. Formen und Rendering-Regeln

| BlockStyle | Form |
|---|---|
| 0 | Cube |
| 1 | Wedge |
| 2 | Corner |
| 3 | Cross |
| 4 | Tetra |
| 5 | Penta |
| 6 | Hepta / Cube-Fallback |

Wichtige Regeln:

- Cross-Blöcke verwenden Textur-Alpha auch ohne `Transparency`;
- animierte Texturen laufen über aufeinanderfolgende Tiles;
- Aktivierungstexturen verwenden nach StarMade-Regeln benachbarte Tiles;
- Slabs ändern die Vorschau-Dicke;
- Orientierung rotiert asymmetrische Formen.

---

## 11. Lichtvorschau

Blöcke mit `LightSource` können als aktive Lichtquelle angezeigt werden.

`LightSourceColor` verwendet:

```text
[r, g, b, intensity]
```

Die ersten drei Werte sind die Farbe, der vierte ist die Intensität.

---

## 12. Erweiterte Eigenschaften

BlockConfig enthält viele Spezialfelder für Ressourcen, Rezepte, Factories, Chambers, Controllers, Kollision, LOD, Logik und Gameplay.

Der erweiterte Editor bietet strukturierte Bedienelemente für häufige Felder und erhält unbekannte Felder, damit keine Daten verloren gehen.

Wenn Sie eine Eigenschaft nicht kennen, lassen Sie sie unverändert.

---

## 13. Sprache

Der Sprachschalter im Header ändert UI-Texte und Hilfen. Gespeicherte StarMade-Daten werden dadurch nicht verändert.

Verfügbare Sprachen: Englisch, Französisch, Deutsch, Spanisch, Russisch und Japanisch.

---

## 14. Empfohlener sicherer Ablauf

1. Sichern Sie Ihre StarMade-Custom-Dateien.
2. Starten Sie den Editor.
3. Bearbeiten Sie jeweils einen Block.
4. Speichern Sie.
5. Laden Sie die App neu und prüfen Sie die Werte.
6. Testen Sie Gameplay-Änderungen in StarMade.

---

## 15. Fehlerbehebung

### StarMade-Ordner ist ungültig

Prüfen Sie, ob der Pfad zu folgendem Inhalt führt:

```text
data/config/BlockConfig.xml
```

### Texturen werden nicht aktualisiert

Öffnen Sie den Atlas erneut, nutzen Sie den Reload-Button oder starten Sie die App neu.

### Browser öffnet sich nicht

Öffnen Sie manuell:

```text
http://localhost:3847
```

### Build schlägt fehl

```bash
npm install
npm run build
```

Starten Sie danach mit `--rebuild` neu.

---

## 16. Für Maintainer

Nützliche Befehle:

```bash
npm run docs:check
npm test
npm run build
```

Technische Dokumentation:

```text
docs/CODEBASE_DOCUMENTATION.md
```
