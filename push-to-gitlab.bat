@echo off
chcp 65001 > nul
echo ========================================================
echo   Отправка проекта CRM на GitLab (crm9930836/crm)
echo ========================================================
echo.
git config http.sslVerify false
echo [1/2] Добавляем изменения и ветку main...
git branch -M main
echo [2/2] Отправляем все файлы в репозиторий GitLab...
git push -u gitlab main
echo.
echo ========================================================
echo   ГОТОВО! Все файлы и ключи синхронизированы с GitLab!
echo   Репозиторий: https://gitlab.com/crm9930836/crm
echo ========================================================
pause
