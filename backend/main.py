"""
Alias para poder ejecutar uvicorn desde DENTRO de la carpeta backend/:

    cd backend
    python -m uvicorn main:app --port 8000

(Desde la raíz del proyecto también funciona `uvicorn main:app`
 gracias al alias main.py de la raíz.)
"""
from app import app  # noqa: F401
