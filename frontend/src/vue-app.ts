import { createApp, h, reactive } from "vue";
import SchoolMap from "./components/SchoolMap.vue";
import type { Establecimiento } from "./types";

export interface VueBridge {
  unmount: () => void;
  /** Actualiza props del mapa Vue (escribe a través del proxy reactivo). */
  setProps: (partial: Partial<VueProps>) => void;
  /** Selecciona una escuela por id (equivalente a setProps({ selectedId })). */
  selectCueanexo: (id: string) => void;
  clearSelection: () => void;
}

export interface VueProps {
  establecimientos: Establecimiento[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  listVersion: number;
}

export interface VueCallbacks {
  onSelect: (id: string) => void;
  onClear: () => void;
}

/**
 * Monta el componente Vue dentro del nodo dado y devuelve un puente
 * para que React pueda pasarle props (reactivas) y seleccionar escuelas.
 */
export function mountVueMap(
  container: HTMLElement,
  props: VueProps,
  callbacks: VueCallbacks
): VueBridge {
  // Estado reactivo de Vue: solo se muta a través del proxy (setProps),
  // para que cada cambio dispare la actualización del componente Vue.
  const state = reactive<VueProps>({ ...props });

  const app = createApp({
    render: () =>
      h(SchoolMap, {
        establecimientos: state.establecimientos,
        loading: state.loading,
        error: state.error,
        selectedId: state.selectedId,
        listVersion: state.listVersion,
        onSelect: callbacks.onSelect,
        onClear: callbacks.onClear,
      }),
  });

  app.mount(container);

  return {
    unmount: () => app.unmount(),
    setProps: (partial) => {
      Object.assign(state, partial);
    },
    selectCueanexo: (id) => {
      state.selectedId = id;
    },
    clearSelection: () => {
      state.selectedId = null;
    },
  };
}

export type { Establecimiento };
