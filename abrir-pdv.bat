@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Ligando o PDV...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\garantir-servicos.ps1"
if errorlevel 1 (
  echo.
  echo Nao consegui subir o sistema. Deixa esta janela aberta e chama o suporte.
  pause
  exit /b 1
)

set "URL=http://127.0.0.1:4173/index.html"
set "PERFIL=%LOCALAPPDATA%\SM-Panificadora-PDV-Chrome"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not defined CHROME (
  echo Chrome nao encontrado.
  pause
  exit /b 1
)

start "" "%CHROME%" --kiosk --kiosk-printing --user-data-dir="%PERFIL%" "%URL%"
endlocal
