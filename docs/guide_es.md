# StarMade Block Editor — Guía de usuario

Esta guía explica cómo funciona StarMade Block Editor: inicio, configuración, navegación, edición de bloques, texturas, iconos y guardado.

---

## 1. Qué hace la aplicación

StarMade Block Editor es una aplicación web local para editar visualmente definiciones de bloques de StarMade.

Tiene dos partes:

- un **servidor** que lee y escribe archivos de StarMade;
- una **interfaz web** con lista de bloques, vista previa 3D, selectores de texturas/iconos y editor de propiedades.

En modo producción se abre en:

```text
http://localhost:3847
```

La aplicación lee los datos vanilla de StarMade, pero guarda los cambios como overrides custom. Así se evita modificar directamente los archivos originales del juego.

---

## 2. Iniciar la aplicación

### Windows

```bat
start.bat
```

### Linux / macOS / WSL

```bash
./start.sh
```

El script comprueba Node.js/npm, instala dependencias si faltan, compila si no existe `dist`, inicia el servidor y abre el navegador.

Para forzar una recompilación:

```bash
./start.sh --rebuild
```

```bat
start.bat --rebuild
```

---

## 3. Primera configuración

En el primer inicio debes indicar la carpeta de instalación de StarMade.

Ejemplos:

```text
D:\Jeux\Steam\steamapps\common\StarMade\
```

```text
/mnt/d/Jeux/Steam/steamapps/common/StarMade/
```

El servidor valida la carpeta buscando archivos como:

```text
data/config/BlockConfig.xml
```

Si usas WSL, las rutas de Windows se convierten automáticamente a `/mnt/<unidad>/...`.

La configuración local se guarda en:

```text
SMToolConfig.json
```

---

## 4. Interfaz principal

La interfaz tiene tres columnas:

```text
Barra lateral | Visor 3D | Propiedades
```

### Barra lateral

Permite:

- buscar por nombre, tipo XML o ID;
- mostrar/ocultar bloques vanilla;
- mostrar/ocultar bloques custom;
- mostrar/ocultar bloques deprecated;
- seleccionar el bloque a editar.

### Visor 3D

Muestra el bloque seleccionado con geometría y mapeo de atlas estilo StarMade.

Puedes:

- rotar, acercar y mover la cámara;
- cambiar la orientación;
- alternar el estado activo/inactivo;
- previsualizar luces;
- elegir una cara para editar su textura.

### Panel de propiedades

Edita el borrador del bloque seleccionado:

- identidad, nombre, descripción e icono;
- vida, masa, volumen, precio y armadura;
- forma, orientación, slab y variantes;
- opciones de renderizado y textura;
- flags de gameplay, lógica, tienda y deprecated;
- color e intensidad de luz;
- propiedades avanzadas de BlockConfig.

---

## 5. Flujo de edición

1. Selecciona un bloque en la barra lateral.
2. El bloque aparece en el visor 3D.
3. El panel de propiedades crea un borrador editable.
4. Cambia campos, texturas, icono o propiedades avanzadas.
5. Guarda.
6. El servidor escribe los datos custom y recarga el bloque.

Importante: editar un bloque vanilla no modifica directamente el archivo vanilla. Al guardar se crea un override custom.

---

## 6. Guardado y bloques custom

Al guardar:

- un bloque vanilla pasa a ser override custom;
- un bloque custom existente se actualiza;
- las propiedades XML desconocidas se conservan cuando es posible;
- la interfaz marca el bloque como custom.

Este diseño protege los datos originales del juego.

---

## 7. Crear un nuevo bloque

Usa el botón **New block** en la cabecera.

La app crea un bloque custom con valores por defecto, lo selecciona y lo abre en el editor.

---

## 8. Editar texturas

### Selector de caras

Debajo del visor 3D, el selector depende de `IndividualSides`:

- **1 lado:** todas las caras comparten la misma textura;
- **3 lados:** grupos front/back, top/bottom, left/right;
- **6 lados:** cada cara tiene su propia textura.

Haz clic en una cara para abrir el atlas.

### Atlas

El atlas muestra las tiles de StarMade. Al hacer clic, se asigna el ID de tile a la cara seleccionada.

| Page | Fuente | IDs |
|---|---|---|
| 0 | `t000.png` | `0–255` |
| 1 | `t001.png` | `256–511` |
| 2 | `t002.png` | `512–767` |
| 3 | `t003.png` | `768–1023` |
| 4–6 | reservado | `1024–1791` |
| 7 | `custom.png` | `1792–2047` |

### Gestor de atlas custom

Permite:

- importar un atlas custom completo;
- reemplazar una tile custom individual;
- elegir diffuse o normal map.

Después de importar, la app refresca las cachés del atlas.

---

## 9. Editar iconos

Abre el selector de iconos desde el panel de propiedades.

El selector muestra hojas de iconos de StarMade y escribe el ID numérico en el borrador del bloque.

---

## 10. Formas y reglas de renderizado

| BlockStyle | Forma |
|---|---|
| 0 | Cube |
| 1 | Wedge |
| 2 | Corner |
| 3 | Cross |
| 4 | Tetra |
| 5 | Penta |
| 6 | Hepta / fallback cube |

Reglas importantes:

- los bloques Cross usan alpha de textura aunque `Transparency` esté desactivado;
- las texturas animadas avanzan por tiles consecutivas;
- las texturas de activación usan la tile vecina según reglas de StarMade;
- los slabs cambian el grosor de la vista previa;
- la orientación rota las formas asimétricas.

---

## 11. Vista previa de luces

Los bloques con `LightSource` pueden previsualizarse como luces activas.

`LightSourceColor` usa:

```text
[r, g, b, intensity]
```

Los tres primeros valores son el color y el cuarto es la intensidad.

---

## 12. Propiedades avanzadas

BlockConfig contiene campos especializados para recursos, recetas, factories, chambers, controllers, colisión, LOD, lógica y gameplay.

El editor avanzado ofrece controles estructurados para campos comunes y conserva campos desconocidos para evitar pérdida de datos.

Si no conoces una propiedad avanzada, déjala sin cambios.

---

## 13. Idioma

El selector de idioma en la cabecera cambia etiquetas y ayudas de la interfaz. No modifica los datos guardados de StarMade.

Idiomas disponibles: inglés, francés, alemán, español, ruso y japonés.

---

## 14. Flujo seguro recomendado

1. Haz una copia de seguridad de tus archivos custom de StarMade.
2. Inicia el editor.
3. Edita un bloque a la vez.
4. Guarda.
5. Recarga la app y verifica los valores.
6. Prueba en StarMade si el cambio afecta al gameplay.

---

## 15. Solución de problemas

### La carpeta StarMade no es válida

Comprueba que la ruta contiene o apunta a:

```text
data/config/BlockConfig.xml
```

### Las texturas no se actualizan

Reabre el atlas, usa el botón de recarga de texturas o reinicia la app.

### El navegador no se abre

Abre manualmente:

```text
http://localhost:3847
```

### El build falla

```bash
npm install
npm run build
```

Luego reinicia con `--rebuild`.

---

## 16. Para mantenedores

Comandos útiles:

```bash
npm run docs:check
npm test
npm run build
```

Documentación técnica:

```text
docs/CODEBASE_DOCUMENTATION.md
```
