@echo off
chcp 65001 >nul
title Pok�idle Cluster 24/7  Submarino & Submarino2
color 0A

echo =====================================================================
echo           POK�IDLE DUAL CLUSTER AUTO-FARM ^& AUTO-CATCHER
echo =====================================================================
echo.

set CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
set PROFILE_ACC1="C:\temp\pokeidle_profiles\acc_1"
set PROFILE_ACC2="C:\temp\pokeidle_profiles\acc_2"

if not exist %PROFILE_ACC1% (
    mkdir %PROFILE_ACC1%
)
if not exist %PROFILE_ACC2% (
    mkdir %PROFILE_ACC2%
)

:: 1. Inicia Webhook Hub (Porta 4567) se nao estiver ativo
netstat -ano | findstr 4567 >nul
if %errorlevel% neq 0 (
    echo [1/4] Iniciando Servidor Webhook de Telemetria (Porta 4567)...
    start /B node src/webhook_hub.js >nul 2>&1
) else (
    echo [1/4] Servidor Webhook (Porta 4567) ja esta ativo.
)

:: 2. Checa Porta 9222 (Conta 1 - Submarino)
netstat -ano | findstr 9222 >nul
if %errorlevel% neq 0 (
    echo [2/4] Iniciando Conta 1 (Submarino) na Porta 9222...
    start "" %CHROME_BIN% --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=%PROFILE_ACC1% --no-first-run --no-default-browser-check --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding "https://pokeidle.io/app"
) else (
    echo [2/4] Conta 1 (Submarino) ja esta ativa na Porta 9222.
)

:: 3. Checa Porta 9223 (Conta 2 - Submarino2)
netstat -ano | findstr 9223 >nul
if %errorlevel% neq 0 (
    echo [3/4] Iniciando Conta 2 (Submarino2) na Porta 9223...
    start "" %CHROME_BIN% --remote-debugging-port=9223 --remote-allow-origins=* --user-data-dir=%PROFILE_ACC2% --no-first-run --no-default-browser-check --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding "https://pokeidle.io/app"
) else (
    echo [3/4] Conta 2 (Submarino2) ja esta ativa na Porta 9223.
)

echo [4/4] Aguardando estabilizacao das sessoes CDP (3s)...
ping 127.0.0.1 -n 4 >nul

:: Injeta Auto-Catcher Seletivo
cd /d "%~dp0"
node src/auto_catcher.js 9222 >nul 2>&1
node src/auto_catcher.js 9223 >nul 2>&1

:: Inicia o Streamer Persistente em tempo real
start /B node src/streamer.js >nul 2>&1

:: Inicia a Mini HUD Nativa Windows (WPF Master-Detail Flutuante e Minimizavel)
start "" powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -STA -Command "& '%~dp0src\hud_windows.ps1'"

echo.
echo =====================================================================
echo   STATUS DO CLUSTER EM TEMPO REAL:
echo =====================================================================
node src/analyzer.js
echo.
echo =====================================================================
echo   Cluster operando 100%% em tempo real!
echo   - Mini HUD Nativa com miniaturas e destaques aberta na sua area de trabalho.
echo   - Clique em qualquer conta para expandir e ver detalhes completos.
echo   - Voce pode minimizar a HUD ou fechar esta janela preta. O farm continua.
echo =====================================================================
pause
