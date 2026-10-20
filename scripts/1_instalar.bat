@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

echo ============================================
echo  1/3  Instalacion del mapa de escuelas
echo ============================================

echo.
echo ^>^> Creando entorno virtual de Python...
if not exist .venv (
  python -m venv .venv
  if errorlevel 1 (
    echo [ERROR] No se pudo crear el venv. Verifica que Python 3.10+ este instalado y en el PATH.
    pause & exit /b 1
  )
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
echo ^>^> Instalando dependencias de Python (fastapi, uvicorn, openpyxl)...
pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Fallo la instalacion de dependencias de Python.
  pause & exit /b 1
)

echo.
echo ^>^> Instalando dependencias del frontend (npm)...
pushd frontend
call npm install
if errorlevel 1 (
  popd
  echo [ERROR] Fallo npm install. Verifica que Node.js 18+ este instalado.
  pause & exit /b 1
)
popd

echo.
echo ============================================
echo  [OK] Instalacion completa
echo  Siguiente paso: scripts\2_iniciar.bat
echo ============================================
pause
