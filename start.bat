@echo off
chcp 65001 > nul
echo ===================================================
echo   Запуск Online CRM amoPRO (WhatsApp & Telegram QR)
echo ===================================================
echo.
echo Запуск Backend сервера и Frontend интерфейса...
echo Backend API: http://localhost:5000
echo Frontend UI: http://localhost:3000
echo.
npm run dev
pause
