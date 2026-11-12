@echo off
if /I "%~1"=="stop" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Stop
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1"
)
