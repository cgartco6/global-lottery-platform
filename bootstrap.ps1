# Windows 10 Pro Bootstrap Script
Write-Host "==============================================" -ForegroundColor Gold
Write-Host "Initializing Global Lottery Platform Stack..." -ForegroundColor Gold
Write-Host "==============================================" -ForegroundColor Gold

# Check for Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "Found Node.js: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "Node.js is missing! Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Exit
}

# Copy Environment File if missing
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "Created .env file from .env.example" -ForegroundColor Yellow
    } else {
        New-Item .env -ItemType File
        Set-Content .env "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lottery_db`nPORT=3000"
        Write-Host "Created fresh default .env configuration." -ForegroundColor Yellow
    }
}

# Install Dependencies
Write-Host "Installing NPM Packages..." -ForegroundColor Cyan
npm install

Write-Host "Build/Compilation completed successfully. Run npm run start to launch." -ForegroundColor Green
