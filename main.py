"""
Alias de compatibilidad para arrancar la API.

Formas equivalentes (ejecutando desde la raíz del proyecto):

    python -m uvicorn backend.app:app --port 8000    <- forma canónica
    uvicorn main:app --port 8000                     <- alias de los tutoriales
                                                        genéricos de FastAPI
"""
from backend.app import app  # noqa: F401
