@echo off
REM Latenite AI - Quick Start Script for Docker (Windows)
REM This script helps you get started quickly on Windows

echo.
echo ================================================
echo  Latenite AI - Docker Quick Start (Windows)
echo ================================================
echo.

REM Check if Docker is installed
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

where docker-compose >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose is not installed!
    echo Please install Docker Compose
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] No .env file found!
    echo.
    echo Creating .env from template...
    copy .env.docker.example .env
    echo.
    echo Please edit .env and add your API keys:
    echo   - ANTHROPIC_API_KEY ^(required^)
    echo   - OPENAI_API_KEY ^(optional^)
    echo.
    echo After editing .env, run this script again!
    pause
    exit /b 0
)

echo [OK] Environment file found
echo.

REM Check if API key is configured
findstr /C:"sk-ant-api03-" .env >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] ANTHROPIC_API_KEY not configured in .env!
    echo.
    echo Please edit .env and add your Anthropic API key
    echo Get it from: https://console.anthropic.com/settings/keys
    echo.
    pause
    exit /b 0
)

echo [OK] API keys configured
echo.

REM Ask for deployment mode
echo Select deployment mode:
echo 1^) Development ^(with hot reload^)
echo 2^) Production ^(single instance^)
echo 3^) Production ^(scaled - 3 instances^)
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Starting in DEVELOPMENT mode...
    docker-compose -f docker-compose.dev.yml up
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo Starting in PRODUCTION mode ^(single instance^)...
    docker-compose up -d
    echo.
    echo [OK] Services started!
    echo.
    echo Access application: http://localhost:5000
    echo View logs: docker-compose logs -f
    echo Stop services: docker-compose down
    goto :end
)

if "%choice%"=="3" (
    echo.
    echo Starting in PRODUCTION mode ^(scaled to 3 instances^)...
    docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=3
    echo.
    echo [OK] Services started with 3 replicas!
    echo.
    echo Access application: http://localhost:80
    echo View logs: docker-compose logs -f
    echo Stop services: docker-compose -f docker-compose.prod.yml down
    goto :end
)

echo [ERROR] Invalid choice!
pause
exit /b 1

:end
echo.
echo Latenite AI is running!
echo.
pause

