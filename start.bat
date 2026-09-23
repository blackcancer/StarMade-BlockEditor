@echo off
setlocal EnableExtensions
rem StarMade Block Editor — production startup script for Windows.
rem
rem Usage:
rem   start.bat            install deps if missing, build if dist is missing, start app
rem   start.bat --rebuild  force a production rebuild before starting
rem   set PORT=8080        override the default server port before launching

cd /d "%~dp0"

if "%PORT%"=="" set "PORT=3847"
set "APP_URL=http://localhost:%PORT%"
set "FORCE_BUILD=0"

if /I "%~1"=="--help" goto :help
if /I "%~1"=="-h" goto :help
if /I "%~1"=="--rebuild" set "FORCE_BUILD=1"
if /I "%~1"=="--build" set "FORCE_BUILD=1"
if not "%~2"=="" goto :unknown
if not "%~1"=="" if /I not "%~1"=="--rebuild" if /I not "%~1"=="--build" goto :unknown

where node >nul 2>nul
if errorlevel 1 (
  echo [BlockEditor] Node.js is required but was not found in PATH.
  echo Install Node.js 22.16+ and retry.
  pause
  exit /b 1
)

node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a*1000+b>=22016?0:1)"
if errorlevel 1 (
  echo [BlockEditor] Node.js 22.16+ is required.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [BlockEditor] npm is required but was not found in PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [BlockEditor] Dependencies not found; running npm ci...
  call npm ci
  if errorlevel 1 goto :fail
)

if "%FORCE_BUILD%"=="1" goto :build
if not exist "server\dist\index.js" goto :build
if not exist "client\dist\index.html" goto :build
echo [BlockEditor] Existing production build found. Use --rebuild to force a rebuild.
goto :start

:build
echo [BlockEditor] Building production server/client...
call npm run build
if errorlevel 1 goto :fail

:start
echo [BlockEditor] Starting app on %APP_URL%
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%APP_URL%'"
set "NODE_ENV=production"
call npm start
exit /b %ERRORLEVEL%

:help
echo StarMade Block Editor startup
echo.
echo Usage: start.bat [--rebuild]
echo Environment: PORT=3847 by default
exit /b 0

:unknown
echo Unknown option: %*
echo Use --help for usage.
exit /b 2

:fail
echo [BlockEditor] Startup failed.
pause
exit /b 1
