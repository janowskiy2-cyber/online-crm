@echo off
chcp 65001 > nul
echo ============================================
echo   Отправка проекта CRM на ваш GitHub
echo ============================================
echo.
git config http.sslVerify false
git branch -M main
git push -u origin main
echo.
echo Готово!
pause
