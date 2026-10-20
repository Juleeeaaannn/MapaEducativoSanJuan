@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

if not exist .venv\Scripts\python.exe (
  echo [ERROR] Primero ejecuta scripts\1_instalar.bat
  pause & exit /b 1
)

echo ^>^> Generando build de produccion del frontend...
pushd frontend
call npm run build
if errorlevel 1 (
  popd
  echo [ERROR] Fallo el build del frontend.
  pause & exit /b 1
)
popd

echo.
echo ^>^> Sirviendo API + frontend en un solo servidor...
echo     http://127.0.0.1:8000  (Ctrl+C para detener)
start "" http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn backend.app:app --port 8000
