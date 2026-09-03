@echo off
chcp 65001 > nul
echo ========================================================
echo   Автономный запуск тестирования CRM (Playwright Robot)
echo ========================================================
echo.
cd /d "e:\проэкт онлайн срм"
node test-crm-robot.js
pause
