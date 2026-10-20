"""
Verificación rápida del Excel, sin levantar el servidor.

Uso:  python backend/verificar.py     (o scripts/4_verificar_datos.bat)
"""
import sys

sys.stdout.reconfigure(encoding="utf-8")

from app import cargar_datos, XLSX_PATH  # noqa: E402


def main() -> int:
    print("=" * 62)
    print("  Verificación de datos_actualizados.xlsx")
    print("=" * 62)
    print(f"\nArchivo: {XLSX_PATH}")

    datos = cargar_datos()
    if not datos.get("ok"):
        print(f"\n[ERROR] {datos.get('error')}")
        print("\nRevisá el archivo o ajustá los alias en backend/app.py (ALIASES).")
        return 1

    print(f"Hoja               : {datos['hoja']}")
    print(f"Encabezados en fila: {datos['fila_encabezados']}")
    print(f"Última modificación: {datos['actualizado']}")

    print("\nColumnas detectadas:")
    for campo, col in datos["columnas"].items():
        print(f"  {campo:<14} <- columna '{col}'")
    if datos["columnas_extra"]:
        print(f"  (columnas extra ignoradas: {', '.join(datos['columnas_extra'][:8])})")

    print("\nResumen:")
    print(f"  Filas leídas            : {datos['total_filas']}")
    print(f"  Con coordenadas válidas : {datos['con_coordenadas']}")
    print(f"  Sin coordenadas         : {datos['sin_coordenadas']}")
    if datos["coordenadas_invalidas"]:
        print(f"  [AVISO] {datos['coordenadas_invalidas']} filas con coordenadas ilegibles o fuera de rango")
    if datos["cueanexos_duplicados"]:
        print(f"  [AVISO] {datos['cueanexos_duplicados']} CUEANEXO duplicados")

    print("\nMuestra (primeras 5 filas):")
    for e in datos["establecimientos"][:5]:
        cue = e["cueanexo"] or "(sin cue)"
        print(f"  {cue:<12} {e['nombre'][:38]:<40} ({e['lat']}, {e['lon']})")

    print("\nSi algún campo se mapeó mal, renombrá el encabezado en el Excel")
    print("o agregá el nombre a ALIASES en backend/app.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
