@echo off
REM Script para reiniciar o servidor Salon ERP facilmente
REM Executa: cd salon-erp\backend && npm start

cd /d C:\Users\bari.NTMAD243\salon-erp\backend

echo.
echo 🚀 Iniciando servidor Salon ERP...
echo 📍 Localização: %CD%
echo ⏱️  Hora: %date% %time%
echo.

npm start

pause
