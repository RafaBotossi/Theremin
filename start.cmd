@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-server.ps1" -Action start
if errorlevel 1 pause
endlocal
