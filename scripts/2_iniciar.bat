@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

if not exist .venv\Scripts\python.exe (
  echo [ERROR] Primero ejecuta scripts\1_instalar.bat
  pause & exit /b 1
)

echo Iniciando backend  -^> http://127.0.0.1:8000
start "Backend API" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.app:app --port 8000"

echo Iniciando frontend -^> http://localhost:5173
start "Frontend Vite" cmd /k "cd /d %~dp0..\frontend && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo [OK] Backend y frontend en ventanas separadas.
echo      Cierra esas ventanas para detener el servidor.
echo      (Para un solo servidor todo-en-uno usa scripts\3_produccion.bat)
