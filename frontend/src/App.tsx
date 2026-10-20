import { useEffect, useRef, useState } from "react";
import { mountVueMap } from "./vue-app";
import type { VueBridge } from "./vue-app";
import type { DatosEstablecimientos, Establecimiento } from "./types";

/**
 * App React: obtiene los datos de la API Python y monta el mapa Vue.
 * La comunicación es bidireccional:
 *   React → Vue: setProps (datos, carga, errores, selección)
 *   Vue → React: callbacks onSelect / onClear (clic en marcadores)
 */
export default function App() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);

  const contenedor = useRef<HTMLDivElement | null>(null);
  const puente = useRef<VueBridge | null>(null);

  // Cargar establecimientos desde la API FastAPI
  useEffect(() => {
    let vivo = true;
    fetch("/api/establecimientos")
      .then(async (res) => {
        const datos = (await res.json()) as DatosEstablecimientos;
        if (!vivo) return;
        if (!res.ok || !datos.ok) {
          setError(datos.error || `Error ${res.status} al leer el Excel`);
          return;
        }
        setEstablecimientos(datos.establecimientos ?? []);
        setListVersion((v) => v + 1);
      })
      .catch(() => {
        if (vivo) {
          setError(
            "No se pudo conectar con la API. Levantá el backend con scripts/2_iniciar.bat"
          );
        }
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Montar la app Vue dentro de React (una sola vez)
  useEffect(() => {
    if (!contenedor.current) return;
    const puenteLocal = mountVueMap(
      contenedor.current,
      {
        establecimientos: [],
        loading: true,
        error: null,
        selectedId: null,
        listVersion: 0,
      },
      {
        onSelect: (id) => setSelectedId(id),
        onClear: () => setSelectedId(null),
      }
    );
    puente.current = puenteLocal;
    return () => {
      puenteLocal.unmount();
      puente.current = null;
    };
  }, []);

  // Sincronizar estado de React → props reactivas de Vue
  useEffect(() => {
    puente.current?.setProps({
      establecimientos,
      loading,
      error,
      selectedId,
      listVersion,
    });
  }, [establecimientos, loading, error, selectedId, listVersion]);

  return (
    <div className="app">
      <div ref={contenedor} className="vue-mapa" />
    </div>
  );
}
