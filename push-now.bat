@echo off
chcp 65001 > nul
echo ========================================================
echo   Отправка обновления CRM в GitHub (janowskiy2-cyber)
echo ========================================================
echo.
echo Внимание: Чтобы отправить код без конфликтов со вторым
echo аккаунтом, вам нужен Personal Access Token (Токен доступа).
echo.
echo Как его получить (1 минута):
echo 1. Откройте в браузере: https://github.com/settings/tokens
echo 2. Нажмите "Generate new token (classic)"
echo 3. В поле Note напишите: crm
echo 4. Поставьте галочку [x] repo
echo 5. Нажмите зеленую кнопку "Generate token" внизу
echo 6. Скопируйте полученный токен (начинается на ghp_...)
echo.
set /p TOKEN="Вставьте ваш токен и нажмите Enter: "

if "%TOKEN%"=="" (
    echo [ОШИБКА] Токен не введен.
    pause
    exit /b
)

echo.
echo [1/2] Привязываем токен к репозиторию CRM...
git remote set-url origin https://%TOKEN%@github.com/janowskiy2-cyber/online-crm.git

echo [2/2] Отправляем все файлы на GitHub...
git push origin main

echo.
echo ========================================================
echo   ГОТОВО! Файлы успешно обновлены на GitHub.
echo   Render и Vercel автоматически подхватят обновление.
echo ========================================================
pause
