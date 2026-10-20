/**
 * Tipos compartidos entre React y Vue.
 * Deben coincidir con lo que devuelve GET /api/establecimientos.
 */

export interface Establecimiento {
  /** id único (cueanexo + sufijo si hay repetidos) */
  id: string;
  /** CUEANEXO, solo dígitos */
  cueanexo: string;
  /** primeros 7 dígitos del CUEANEXO */
  cue: string;
  nombre: string;
  lat: number | null;
  lon: number | null;
  coordenadas_validas: boolean;
  departamento: string;
  localidad: string;
  nivel: string;
  sector: string;
  direccion: string;
  /** columnas adicionales del Excel */
  extras: Record<string, string>;
}

export interface LineaEntrecruzamiento {
  id: string;
  origen: string;
  destino: string;
  /** [[latOrigen, lonOrigen], [latDestino, lonDestino]] */
  coordenadas: [number, number][];
}

export interface RespuestaEntrecruzamientos {
  ok: boolean;
  error?: string;
  total_filas?: number;
  lineas: LineaEntrecruzamiento[];
  ignorados?: {
    formato_invalido: number;
    cue_no_encontrado: string[];
    cue_no_encontrado_total: number;
  };
}

export interface DatosEstablecimientos {
  ok: boolean;
  error?: string;
  archivo?: string;
  actualizado?: string | null;
  hoja?: string;
  total_filas?: number;
  con_coordenadas?: number;
  sin_coordenadas?: number;
  coordenadas_invalidas?: number;
  cueanexos_duplicados?: number;
  establecimientos: Establecimiento[];
}
