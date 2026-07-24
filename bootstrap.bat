@echo off
TITLE Global Lottery Platform Bootstrapper
echo ==============================================
echo Windows 10 Pro Command Launching Bootstrap Suite
echo ==============================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed! Install node before continuing.
    pause
    exit /b
)

if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo Environment file copied from example config.
    ) else (
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lottery_db> .env
        echo PORT=3000>> .env
        echo Fresh basic config written to .env file.
    )
)

echo Installing node packages...
call npm install

echo System setup ready. Compile and run project.
pause
