@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Parando Pokéidle Cluster...
color 0C

echo =====================================================================
echo                ENCERRANDO POKÉIDLE CLUSTER
echo =====================================================================
echo.
echo [1/3] Finalizando processos do Google Chrome (9222 e 9223)...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and ($_.CommandLine -like '*remote-debugging-port=9222*' -or $_.CommandLine -like '*remote-debugging-port=9223*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/3] Finalizando servidores de telemetria e scripts de automacao...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*cluster_manager*' -or $_.CommandLine -like '*streamer*' -or $_.CommandLine -like '*webhook_hub*' -or $_.CommandLine -like '*auto_heal*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [3/3] Finalizando Pokéidle Cluster HUD e removendo icone da bandeja...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*hud_windows*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo =====================================================================
echo    TODOS OS PROCESSOS FORAM ENCERRADOS COM SUCESSO!
echo =====================================================================
ping 127.0.0.1 -n 3 >nul
exit
