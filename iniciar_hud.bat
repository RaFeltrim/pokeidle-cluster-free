@echo off
cd /d "%~dp0"
start "PokeIdleCluster" /MIN "C:\Program Files\nodejs\node.exe" src\cluster_manager.js
exit
