@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo ============================================
echo  Verificacion de datos_actualizados.xlsx
echo ============================================
echo.

if exist .venv\Scripts\python.exe (
  .venv\Scripts\python.exe backend\verificar.py
) else (
  python backend\verificar.py
)

echo.
pause
