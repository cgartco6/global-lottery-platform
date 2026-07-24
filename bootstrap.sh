#!/bin/bash
set -e

echo -e "\e[33m=============================================="
echo -e "Ubuntu Deployment Engine Initialized"
echo -e "==============================================\e[0m"

# Validate NodeJS
if ! command -v node &> /dev/null; then
    echo -e "\e[31mNode.js missing. Please install node with: nvm install node\e[0m"
    exit 1
fi

# Set up local environment config
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Successfully copied .env.example"
    else
        echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lottery_db" > .env
        echo "PORT=3000" >> .env
        echo "Generated standard fallback config in .env file"
    fi
fi

echo "Deploying system packages..."
npm install

echo -e "\e[32mBootstrap script executed cleanly.\e[0m"
