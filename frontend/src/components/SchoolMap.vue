<template>
  <div class="sj-root">
    <!-- Encabezado minimalista -->
    <header class="sj-header">
      <div class="sj-brand">
        <span class="sj-dot" aria-hidden="true"></span>
        <div>
          <h1>Escuelas de San Juan</h1>
          <p v-if="!loading && !error" class="sj-subtitle">
            {{ conCoordenadas.length }} establecimientos en el mapa
          </p>
        </div>
      </div>

      <!-- Buscador por CUEANEXO / nombre / localidad -->
      <div class="sj-search" role="search">
        <svg class="sj-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          v-model="query"
          class="sj-input"
          type="search"
          placeholder="Buscar CUEANEXO, nombre o localidad…"
          aria-label="Buscar establecimiento"
        />
        <button v-if="query" class="sj-clear" aria-label="Limpiar búsqueda" @click="query = ''">×</button>
      </div>

      <p v-if="query && resultados.length" class="sj-results-info">
        {{ resultados.length }} resultado{{ resultados.length === 1 ? "" : "s" }}
        <span v-if="resultados.length <= 8">— tocá uno para ir a la escuela</span>
      </p>
      <p v-else-if="query" class="sj-results-info sj-empty">Sin resultados para «{{ query }}»</p>

      <!-- Resultados del buscador -->
      <ul v-if="query && resultados.length" class="sj-results">
        <li v-for="e in resultados" :key="e.id">
          <button class="sj-result" type="button" @click="irAEscuela(e)">
            <span class="sj-result-cue">{{ e.cueanexo || "sin CUE" }}</span>
            <span class="sj-result-nombre">{{ e.nombre || "(sin nombre)" }}</span>
            <span v-if="e.localidad" class="sj-result-lugar">{{ e.localidad }}</span>
          </button>
        </li>
      </ul>
    </header>

    <!-- Mapa -->
    <main class="sj-map-wrap">
      <div v-if="loading" class="sj-state">Cargando establecimientos…</div>
      <div v-else-if="error" class="sj-state sj-error">{{ error }}</div>
      <div ref="mapEl" class="sj-map" aria-label="Mapa de escuelas de San Juan"></div>
      <button
        class="sj-dark-toggle"
        type="button"
        :aria-pressed="modoOscuro"
        :title="modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="alternarTema"
      >
        {{ modoOscuro ? "☀️" : "🌙" }}
      </button>

      <!-- Botón + panel de entrecruzamientos -->
      <button
        class="sj-ent-toggle"
        type="button"
        :title="panelEnt ? 'Cerrar entrecruzamientos' : 'Cargar entrecruzamientos'"
        @click="panelEnt = !panelEnt"
      >
        ⛓
      </button>
      <div v-if="panelEnt" class="sj-ent-panel">
        <p class="sj-ent-titulo">Entrecruzamientos</p>
        <p class="sj-ent-desc">
          Subí un archivo <b>.xlsx</b> o <b>.csv</b> con las columnas
          <code>cueanexo</code> y <code>entrecruzamiento</code>. Se dibuja una
          línea recta entre cada escuela y su conexión.
        </p>
        <input
          ref="inputArchivo"
          class="sj-ent-input"
          type="file"
          accept=".xlsx,.xlsm,.csv"
          @change="subirArchivo"
        />
        <p v-if="estadoEnt" class="sj-ent-estado" :class="{ 'sj-ent-error': errorEnt }">{{ estadoEnt }}</p>
        <div v-if="lineasEnt.length" class="sj-ent-acciones">
          <button class="sj-ent-btn" type="button" @click="limpiarEntrecruzamientos">Quitar líneas</button>
          <label class="sj-ent-check">
            <input type="checkbox" v-model="entSiempreVisible" />
            Mostrar líneas en el mapa
          </label>
        </div>
        <template v-if="lineasEnt.length">
          <div class="sj-ent-nav">
            <button
              class="sj-ent-nav-btn"
              type="button"
              title="Conexión anterior"
              aria-label="Conexión anterior"
              @click="anteriorConexion"
            >
              ◀
            </button>
            <span class="sj-ent-nav-info">
              {{ entIndice >= 0 ? `Conexión ${entIndice + 1} de ${lineasEnt.length}` : `${lineasEnt.length} conexiones` }}
            </span>
            <button
              class="sj-ent-nav-btn"
              type="button"
              title="Conexión siguiente"
              aria-label="Conexión siguiente"
              @click="siguienteConexion"
            >
              ▶
            </button>
          </div>
          <ul ref="listaEntEl" class="sj-ent-lista" role="listbox" aria-label="Conexiones entrecruzadas">
            <li
              v-for="(l, i) in lineasEnt"
              :key="l.id"
              class="sj-ent-item"
              :class="{ 'sj-ent-item-activa': i === entIndice }"
              role="option"
              :aria-selected="i === entIndice"
              @click="irAConexion(i)"
            >
              <span class="sj-ent-item-dot" :style="{ background: colorEnt(l.id) }" />
              <span class="sj-ent-item-cues">{{ l.origen }} ↔ {{ l.destino }}</span>
              <span class="sj-ent-item-dist">{{ distanciaEnt(l) }}</span>
            </li>
          </ul>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Establecimiento, LineaEntrecruzamiento, RespuestaEntrecruzamientos } from "../types";

const props = defineProps<{
  establecimientos: Establecimiento[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  listVersion: number;
}>();

const emit = defineEmits<{
  (e: "select", id: string): void;
  (e: "clear"): void;
}>();

/* Enlaces de los botones del popup: cambiar acá cuando estén definidos. */
const ENLACE_A = "https://example.org/accion-1";
const ENLACE_B = "https://example.org/accion-2";

const mapEl = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let grupoMarcadores: L.LayerGroup | null = null;
const marcadoresPorId = new Map<string, L.Marker>();
let seleccionAnterior: string | null = null;

const query = ref("");

/* ------------------------------------------------------------------ */
/* Entrecruzamientos                                                  */
/* ------------------------------------------------------------------ */

const panelEnt = ref(false);
const inputArchivo = ref<HTMLInputElement | null>(null);
const estadoEnt = ref("");
const errorEnt = ref(false);
const lineasEnt = ref<LineaEntrecruzamiento[]>([]);
const entSiempreVisible = ref(true);
const entIndice = ref(-1); // conexión seleccionada en la lista (-1 = ninguna)
const listaEntEl = ref<HTMLElement | null>(null);
const polilineasEnt = new Map<string, L.Polyline>(); // id -> línea interactiva
let temporizadorPopup: ReturnType<typeof setTimeout> | null = null;
let grupoEnt: L.LayerGroup | null = null;

function limpiarEntrecruzamientos() {
  lineasEnt.value = [];
  entIndice.value = -1;
  estadoEnt.value = "";
  errorEnt.value = false;
  if (inputArchivo.value) inputArchivo.value.value = "";
}

async function subirArchivo(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const archivo = input.files?.[0];
  if (!archivo || !map) return;

  estadoEnt.value = "Procesando archivo…";
  errorEnt.value = false;
  const fd = new FormData();
  fd.append("archivo", archivo);
  try {
    const res = await fetch("/api/entrecruzamientos", { method: "POST", body: fd });
    const datos = (await res.json()) as RespuestaEntrecruzamientos;
    if (!res.ok || !datos.ok) {
      estadoEnt.value = datos.error || `Error ${res.status} al procesar el archivo`;
      errorEnt.value = true;
      lineasEnt.value = [];
      return;
    }
    lineasEnt.value = datos.lineas;
    entIndice.value = -1;
    const ign = datos.ignorados;
    const partes = [`${datos.lineas.length} líneas dibujadas`];
    if (ign?.cue_no_encontrado_total)
      partes.push(`${ign.cue_no_encontrado_total} CUE no encontrados`);
    if (ign?.formato_invalido) partes.push(`${ign.formato_invalido} filas inválidas`);
    estadoEnt.value = partes.join(" · ") + (ign?.cue_no_encontrado_total ? ` (ej.: ${ign.cue_no_encontrado.slice(0, 3).join(", ")})` : "");
  } catch {
    estadoEnt.value = "No se pudo conectar con la API.";
    errorEnt.value = true;
  }
}

/* Paleta viva: cada entrecruzamiento tiene su propio color (estable por id). */
const PALETA_ENT = [
  "#e11d48", "#f97316", "#ca8a04", "#16a34a", "#0891b2", "#2563eb",
  "#7c3aed", "#c026d3", "#db2777", "#059669", "#4f46e5", "#b45309",
];

/* Asignación secuencial: garantiza colores distintos entre líneas (se resetea por archivo). */
const coloresAsignados = new Map<string, string>();
let indicePaleta = 0;

function colorEnt(id: string): string {
  const existente = coloresAsignados.get(id);
  if (existente) return existente;
  const color = PALETA_ENT[indicePaleta++ % PALETA_ENT.length];
  coloresAsignados.set(id, color);
  return color;
}

function estiloEnt(id: string) {
  return {
    color: colorEnt(id),
    weight: 4.5,
    opacity: 0.95,
    dashArray: "10 7",
    lineCap: "round" as const,
  };
}

/* Borde de contraste debajo de cada línea para que se note sobre cualquier fondo. */
function estiloEntCasing() {
  return {
    color: modoOscuro.value ? "#0b0d12" : "#ffffff",
    weight: 9,
    opacity: 0.9,
    lineCap: "round" as const,
  };
}

function popupEntHtml(l: LineaEntrecruzamiento): string {
  const color = colorEnt(l.id);
  const nombreOrigen = conCoordenadas.value.find((e) => e.cueanexo === l.origen)?.nombre;
  const nombreDestino = conCoordenadas.value.find((e) => e.cueanexo === l.destino)?.nombre;
  return `
    <div class="sj-popup sj-ent-popup">
      <p class="sj-ent-pop-titulo">
        <span class="sj-ent-pop-dot" style="background:${color}"></span>
        Entrecruzamiento
      </p>
      <div class="sj-ent-pop-fila">
        <span class="sj-ent-pop-cue">${escapar(l.origen)}</span>
        <span class="sj-ent-pop-nombre">${escapar(nombreOrigen || "")}</span>
        <button type="button" data-ir="${escapar(l.origen)}">Ver en mapa</button>
      </div>
      <div class="sj-ent-pop-sep">↕</div>
      <div class="sj-ent-pop-fila">
        <span class="sj-ent-pop-cue">${escapar(l.destino)}</span>
        <span class="sj-ent-pop-nombre">${escapar(nombreDestino || "")}</span>
        <button type="button" data-ir="${escapar(l.destino)}">Ver en mapa</button>
      </div>
    </div>
  `;
}

/* Navegación por la lista de conexiones: vuela a la línea y abre su popup. */
async function irAConexion(i: number) {
  const n = lineasEnt.value.length;
  if (!n || !map) return;
  const idx = ((i % n) + n) % n; // navegación circular
  entIndice.value = idx;
  const l = lineasEnt.value[idx];
  if (!entSiempreVisible.value) entSiempreVisible.value = true; // muestra las líneas si estaban ocultas
  await nextTick(); // deja que el watch las dibuje si hacía falta
  const linea = polilineasEnt.get(l.id);
  desplazarItem(idx);
  if (!linea) return;
  if (temporizadorPopup) clearTimeout(temporizadorPopup); // cancela el popup de una navegación anterior
  map.flyToBounds(linea.getBounds(), { padding: [90, 90], duration: 0.6 });
  temporizadorPopup = setTimeout(() => linea.openPopup(linea.getBounds().getCenter()), 680);
}

/* Mantiene visible el ítem activo dentro de la lista desplazable. */
function desplazarItem(idx: number) {
  void nextTick().then(() => {
    const item = listaEntEl.value?.children[idx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function anteriorConexion() {
  irAConexion(entIndice.value - 1);
}

function siguienteConexion() {
  irAConexion(entIndice.value + 1);
}

/* Distancia aproximada en km entre los dos extremos (Haversine). */
function distanciaEnt(l: LineaEntrecruzamiento): string {
  const a = l.coordenadas[0];
  const b = l.coordenadas[l.coordenadas.length - 1];
  if (!a || !b) return "";
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(s));
  return km < 1 ? "<1 km" : `${Math.round(km)} km`;
}

function irACue(cue: string) {
  const est = conCoordenadas.value.find((e) => e.cueanexo === cue);
  const m = est ? marcadoresPorId.get(est.id) : undefined;
  if (m) {
    map?.closePopup();
    m.fire("click");
    map?.flyTo(m.getLatLng(), Math.max(map!.getZoom(), 15), { duration: 0.6 });
  }
}

watch(
  [lineasEnt, entSiempreVisible],
  () => {
    if (!map) return;
    if (!grupoEnt) grupoEnt = L.layerGroup();
    grupoEnt.clearLayers();
    polilineasEnt.clear();
    coloresAsignados.clear(); // nuevo archivo: reasignar colores desde el inicio de la paleta
    indicePaleta = 0;

    if (entSiempreVisible.value && lineasEnt.value.length) {
      for (const l of lineasEnt.value) {
        // Casing de contraste + línea principal de color propio.
        const casing = L.polyline(l.coordenadas as L.LatLngExpression[], { interactive: false });
        casing.setStyle(estiloEntCasing());
        casing.addTo(grupoEnt);

        const linea = L.polyline(l.coordenadas as L.LatLngExpression[], { interactive: true });
        linea.setStyle(estiloEnt(l.id));
        (linea.options as Record<string, unknown>).sjId = l.id;
        linea.bindTooltip(`CUE ${l.origen} ↔ CUE ${l.destino}`, { sticky: true });
        linea.bindPopup(popupEntHtml(l), { maxWidth: 280, minWidth: 230, className: "sj-leaflet-ent" });
        linea.on("popupopen", (ev) => {
          // Sincroniza la selección de la lista cuando se abre el popup tocando la línea.
          entIndice.value = lineasEnt.value.findIndex((x) => x.id === l.id);
          if (entIndice.value >= 0) desplazarItem(entIndice.value);
          ev.popup
            .getElement()
            ?.querySelectorAll<HTMLButtonElement>("button[data-ir]")
            .forEach((b) => b.addEventListener("click", () => irACue(b.dataset.ir || "")));
        });
        linea.addTo(grupoEnt);
        polilineasEnt.set(l.id, linea);
      }
      grupoEnt.addTo(map);
    } else if (map.hasLayer(grupoEnt)) {
      map.removeLayer(grupoEnt);
    }
  },
  { deep: true }
);

/* Límites aproximados de San Juan (fallback hasta cargar el contorno real). */
const LIMITES_SAN_JUAN = L.latLngBounds([-35.3, -70.9], [-28.2, -65.7]);

/* ------------------------------------------------------------------ */
/* Modo oscuro                                                        */
/* ------------------------------------------------------------------ */

const CLAVE_TEMA = "sj-tema";
const modoOscuro = ref(localStorage.getItem(CLAVE_TEMA) === "oscuro");
let capaTiles: L.TileLayer | null = null;
let capaLimite: L.GeoJSON | null = null;
let mascaraExterior: L.Polygon | null = null;

/* El contorno de la provincia usa teal para NO confundirse con los puntos azules. */
const ESTILO_BORDE = () =>
  modoOscuro.value
    ? { color: "#2dd4bf", weight: 2.5, opacity: 0.95, fill: false }
    : { color: "#0f766e", weight: 2.5, opacity: 0.9, fill: false };

function aplicarTema() {
  if (!map) return;
  document.documentElement.classList.toggle("sj-dark", modoOscuro.value);
  if (capaTiles) map.removeLayer(capaTiles);
  capaTiles = L.tileLayer(
    modoOscuro.value
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: modoOscuro.value
        ? "Tiles &copy; Esri — Esri, DeLorme, NAVTEQ"
        : "&copy; OpenStreetMap",
    }
  ).addTo(map);
  capaLimite?.setStyle(ESTILO_BORDE());
  mascaraExterior?.setStyle(
    modoOscuro.value
      ? { fillColor: "#000000", fillOpacity: 0.55, stroke: false }
      : { fillColor: "#ffffff", fillOpacity: 0.6, stroke: false }
  );
}

function alternarTema() {
  modoOscuro.value = !modoOscuro.value;
  localStorage.setItem(CLAVE_TEMA, modoOscuro.value ? "oscuro" : "claro");
  aplicarTema();
}

// Re-colorear las líneas de entrecruzamientos al cambiar el tema.
watch(modoOscuro, () => {
  grupoEnt?.eachLayer((l) => {
    const opts = (l as L.Polyline).options as Record<string, unknown>;
    (l as L.Polyline).setStyle(
      typeof opts.sjId === "string" ? estiloEnt(opts.sjId) : estiloEntCasing()
    );
  });
});

/* ------------------------------------------------------------------ */
/* Contorno real de la provincia                                      */
/* ------------------------------------------------------------------ */

async function cargarLimiteProvincial() {
  try {
    const res = await fetch("/san-juan-limites.geojson");
    if (!res.ok || !map) return;
    const geo = await res.json();

    capaLimite = L.geoJSON(geo, { style: ESTILO_BORDE, interactive: false }).addTo(map);

    // Atenuar todo lo que está FUERA de la provincia: un polígono del mundo
    // con el contorno de San Juan como hueco.
    const geom = geo.features[0].geometry;
    const anillos: [number, number][][] =
      geom.type === "Polygon"
        ? [geom.coordinates[0]]
        : geom.coordinates.map((pol: number[][][]) => pol[0]);
    const huecos = anillos.map((a) => a.map(([lon, lat]) => [lat, lon] as [number, number]));
    mascaraExterior = L.polygon(
      [
        [
          [-85, -180],
          [85, -180],
          [85, 180],
          [-85, 180],
        ],
        ...huecos, // cada anillo de la provincia = un hueco de la máscara
      ] as L.LatLngExpression[][],
      { interactive: false }
    ).addTo(map);

    // Reajustar límites y vista al contorno real.
    const b = capaLimite.getBounds().pad(0.01);
    map.setMaxBounds(b);
    map.setMinZoom(Math.max(4, Math.floor(map.getBoundsZoom(b)) - 1));
    map.fitBounds(b, { padding: [16, 16] });
  } catch {
    /* Sin contorno: quedan los límites rectangulares aproximados. */
  }
}

/* ------------------------------------------------------------------ */
/* Datos                                                              */
/* ------------------------------------------------------------------ */

const conCoordenadas = computed(() =>
  props.establecimientos.filter((e) => e.coordenadas_validas && e.lat !== null && e.lon !== null)
);

const resultados = computed(() => {
  const q = normalizar(query.value.trim());
  if (!q) return [];
  const qDigitos = q.replace(/\D/g, "");
  const coincidencias = conCoordenadas.value.filter((e) => {
    const cueNorm = normalizar(e.cueanexo);
    return (
      (qDigitos.length >= 3 && e.cueanexo.includes(qDigitos)) ||
      (qDigitos.length >= 3 && cueNorm.includes(q)) ||
      normalizar(e.nombre).includes(q) ||
      normalizar(e.localidad).includes(q) ||
      normalizar(e.departamento).includes(q)
    );
  });
  return coincidencias.slice(0, 8);
});

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ------------------------------------------------------------------ */
/* Mapa                                                               */
/* ------------------------------------------------------------------ */

onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, {
    center: [-31.53, -68.54], // San Juan capital
    zoom: 10,
    zoomControl: true,
    attributionControl: true,
    maxBounds: LIMITES_SAN_JUAN,
    maxBoundsViscosity: 1.0, // tope rígido: no se puede arrastrar fuera de la provincia
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  // Arrancar viendo toda la provincia y limitar el zoom de alejamiento.
  map.fitBounds(LIMITES_SAN_JUAN, { padding: [12, 12] });
  map.setMinZoom(Math.max(4, Math.floor(map.getBoundsZoom(LIMITES_SAN_JUAN)) - 1));

  grupoMarcadores = L.layerGroup().addTo(map);
  renderizarMarcadores();

  if (props.selectedId) enfocarSeleccion(props.selectedId);

  // Contorno real + tema inicial (oscuro o claro, según lo guardado).
  aplicarTema();
  void cargarLimiteProvincial();

  // Handle de depuración/verificación (solo en desarrollo).
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__sjMap = map;
  }
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

function iconoSeleccionado() {
  return L.divIcon({
    className: "sj-pin sj-pin-activo",
    html: `<span class="sj-pin-inner"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function iconoNormal() {
  return L.divIcon({
    className: "sj-pin",
    html: `<span class="sj-pin-inner"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function renderizarMarcadores() {
  const m = map;
  if (!m || !grupoMarcadores) return;
  grupoMarcadores.clearLayers();
  marcadoresPorId.clear();

  for (const e of conCoordenadas.value) {
    if (e.lat === null || e.lon === null) continue;
    const marker = L.marker([e.lat, e.lon], {
      icon: e.id === props.selectedId ? iconoSeleccionado() : iconoNormal(),
      title: e.nombre || e.cueanexo,
      alt: `Escuela ${e.cueanexo}`,
    });

    marker.bindPopup(contenidoPopup(e), { maxWidth: 300, minWidth: 240 });
    marker.on("click", () => emit("select", e.id));
    marker.addTo(grupoMarcadores);
    marcadoresPorId.set(e.id, marker);
  }

  seleccionAnterior = props.selectedId;
}

/** Resalta la escuela seleccionada, abre su popup y vuela hasta ella. */
function enfocarSeleccion(id: string | null) {
  const m = map;
  if (!m) return;

  // Solo actualizar el icono del marcador anterior y del nuevo (rápido con muchos puntos).
  const anterior = seleccionAnterior != null ? marcadoresPorId.get(seleccionAnterior) : undefined;
  if (anterior && seleccionAnterior !== id) anterior.setIcon(iconoNormal());

  const actual = id != null ? marcadoresPorId.get(id) : undefined;
  if (actual) {
    actual.setIcon(iconoSeleccionado());
    actual.openPopup();
    m.flyTo(actual.getLatLng(), Math.max(m.getZoom(), 15), { duration: 0.6 });
  }
  if (!id) m.closePopup();

  seleccionAnterior = id;
}

function contenidoPopup(e: Establecimiento): string {
  const filas = [
    e.departamento && `<span class="sj-chip">${escapar(e.departamento)}</span>`,
    e.localidad && `<span class="sj-chip">${escapar(e.localidad)}</span>`,
    e.nivel && `<span class="sj-chip">${escapar(e.nivel)}</span>`,
    e.sector && `<span class="sj-chip">${escapar(e.sector)}</span>`,
  ].filter(Boolean);

  const extras = Object.entries(e.extras || {})
    .slice(0, 4)
    .map(([k, v]) => `<div class="sj-pop-extra"><b>${escapar(k)}:</b> ${escapar(v)}</div>`)
    .join("");

  return `
    <div class="sj-popup">
      <p class="sj-pop-nombre">${escapar(e.nombre || "(sin nombre)")}</p>
      <div class="sj-pop-cue">
        <span class="sj-pop-cue-label">CUE</span>
        <span class="sj-pop-cue-valor">${escapar(e.cue || "—")}</span>
        <span class="sj-pop-cue-label">CUEANEXO</span>
        <span class="sj-pop-cue-valor">${escapar(e.cueanexo || "—")}</span>
      </div>
      ${filas.length ? `<div class="sj-chips">${filas.join("")}</div>` : ""}
      ${extras}
      <div class="sj-pop-botones">
        <a class="sj-btn sj-btn-primario" href="${ENLACE_A}" target="_blank" rel="noopener">Acción 1</a>
        <a class="sj-btn sj-btn-secundario" href="${ENLACE_B}" target="_blank" rel="noopener">Acción 2</a>
      </div>
    </div>
  `;
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ */
/* Reacciones a cambios                                               */
/* ------------------------------------------------------------------ */

// Al cambiar la lista (ej. recarga del Excel), redibujar marcadores.
watch(
  () => [props.establecimientos, props.listVersion] as const,
  () => renderizarMarcadores()
);

// Selección externa (buscador o React): resaltar y volar a la escuela.
watch(
  () => props.selectedId,
  (id) => enfocarSeleccion(id)
);

function irAEscuela(e: Establecimiento) {
  if (props.selectedId === e.id) {
    enfocarSeleccion(e.id); // ya estaba seleccionada: solo recentrar
  } else {
    emit("select", e.id); // React actualiza el estado y la selección baja como prop
  }
  if (window.matchMedia("(max-width: 720px)").matches) {
    // En móvil, ocultar la lista para ver el mapa.
    query.value = "";
  }
}
</script>
