# Mapa interactivo · Escuelas de San Juan

Mapa web interactivo de establecimientos educativos de San Juan, Argentina, generado a partir de `datos_actualizados.xlsx` (coordenadas + CUEANEXO).

**Stack:** React 18 (shell) + Vue 3 (mapa) + Python FastAPI + Leaflet/OpenStreetMap.

## Características

- 🗺️ Mapa interactivo centrado en San Juan con un punto por escuela (con coordenadas válidas).
- 📍 Icono interactivo: al tocarlo se abre un popup con **CUE** y **CUEANEXO**, más datos del Excel.
- 🔗 Dos botones de acción en cada popup (enlaces a configurar en un solo lugar).
- 🔍 Buscador por **CUEANEXO** (también nombre, localidad y departamento): vuela hasta la escuela y la resalta.
- 📱 Responsive y UX minimalista.

## Requisitos

- Python 3.10+
- Node.js 18+

## Inicio rápido

1. **Instalar** (una sola vez): ejecutá `scripts\1_instalar.bat`
   - Crea el entorno virtual `.venv`, instala `fastapi`, `uvicorn`, `openpyxl` y las dependencias npm.
2. **Verificar los datos** (opcional pero recomendado): `scripts\4_verificar_datos.bat`
   - Muestra qué columnas se detectaron, cuántas filas tienen coordenadas válidas y una muestra de registros.
3. **Iniciar en modo desarrollo**: `scripts\2_iniciar.bat`
   - Backend en `http://127.0.0.1:8000` y frontend en `http://localhost:5173` (se abre solo).

## Uso en producción (un solo servidor)

`scripts\3_produccion.bat` compila el frontend y lo sirve desde FastAPI en `http://127.0.0.1:8000` (API + mapa en el mismo puerto).

## Cómo se leen los datos

El backend (`backend/app.py`) lee la primera hoja con encabezados reconocidos y detecta automáticamente columnas por nombre (sin acentos, mayúsculas ignoradas):

| Campo        | Nombres aceptados (ejemplos)                                            |
| ------------ | ----------------------------------------------------------------------- |
| CUEANEXO     | `cueanexo`, `cue_anexo`, `id_cueanexo`                                  |
| CUE          | `cue` (si no está, se deduce de las primeras cifras del CUEANEXO)       |
| Nombre       | `nombre`, `establecimiento`, `institucion`, `denominacion`, `escuela`   |
| Latitud      | `latitud`, `lat`, `y`                                                   |
| Longitud     | `longitud`, `long`, `lon`, `lng`, `x`                                   |
| Departamento | `departamento`, `depto`                                                 |
| Localidad    | `localidad`, `ciudad`                                                   |
| Nivel        | `nivel`, `niveles`, `nivel_servicio`                                    |
| Sector       | `sector`, `gestion`, `ambito`                                           |
| Dirección    | `direccion`, `domicilio`, `calle`                                       |

Cualquier **columna extra** del Excel se incluye como campo adicional y se muestra en el popup. Si alguna columna no se detecta, agregá su nombre a `ALIASES` en `backend/app.py`.

## Cambiar los enlaces de los botones

Editá `frontend/src/components/SchoolMap.vue`:

```ts
const ENLACE_A = "https://example.org/accion-1"; // botón "Acción 1"
const ENLACE_B = "https://example.org/accion-2"; // botón "Acción 2"
```

Los botones se abren en pestaña nueva (`target="_blank"`).

## Estructura

```
├── datos_actualizados.xlsx        # tus datos (fuente única)
├── backend/
│   ├── app.py                     # API FastAPI + lectura del Excel
│   └── verificar.py               # verificación de datos por consola
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx                # React: fetch de datos + montaje de Vue
│   │   ├── vue-app.ts             # puente React → Vue (props reactivas)
│   │   ├── components/
│   │   │   └── SchoolMap.vue      # mapa, buscador y popups (Vue 3)
│   │   └── index.css              # estilos minimalistas + responsive
│   └── vite.config.ts
├── scripts/
│   ├── 1_instalar.bat
│   ├── 2_iniciar.bat
│   ├── 3_produccion.bat
│   └── 4_verificar_datos.bat
└── requirements.txt
```

## Solución de problemas

### `Error loading ASGI app. Could not import module "main"`

Casi siempre es un problema de **desde dónde ejecutás el comando**: uvicorn busca `main.py` en la carpeta actual. Soluciones:

**Opción A — desde la raíz del proyecto** (recomendada):

```
cd /d "D:\proyecto educativo julian"
.venv\Scripts\python.exe -m uvicorn backend.app:app --port 8000
```

**Opción B — el comando de los tutoriales** (`uvicorn main:app`): también funciona si lo ejecutás desde la raíz (hay un alias `main.py`) o desde `backend/` (hay otro alias ahí).

**Opción C — sin pensar:** ejecutá `scripts\2_iniciar.bat`, que se ubica solo en la raíz y levanta backend + frontend.

## Notas

- Los registros **sin coordenadas válidas** no se dibujan en el mapa (pero sí aparecen en la API).
- El Excel se relee automáticamente si cambia (por ejemplo, si lo actualizás con el servidor corriendo).
- Si actualizás el Excel y cambiaron los nombres de columnas, corré `4_verificar_datos.bat` para confirmar que todo sigue detectándose bien.
