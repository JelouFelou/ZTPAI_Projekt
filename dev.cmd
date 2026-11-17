@echo off
setlocal
if "%~1"=="" goto start
if /I "%~1"=="start" goto start
if /I "%~1"=="restart" goto start
if /I "%~1"=="stop" goto stop
if /I "%~1"=="status" goto status
if /I "%~1"=="logs" goto logs
echo Uzycie: dev.cmd [start^|restart^|stop^|status^|logs]
exit /b 2
:start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1"
goto done
:stop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Stop
goto done
:status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Status
goto done
:logs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Logs
:done
set "result=%errorlevel%"
if not "%result%"=="0" echo BoardRent: polecenie nie powiodlo sie. Sprawdz komunikat powyzej.
exit /b %result%
