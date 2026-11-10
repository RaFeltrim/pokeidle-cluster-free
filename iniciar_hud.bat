@echo off
cd /d "%~dp0"
title PokeIdle HUD
start "" powershell.exe -ExecutionPolicy Bypass -NoProfile -STA -File "%~dp0src\hud_windows.ps1"
exit
