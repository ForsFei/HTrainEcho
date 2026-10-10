@echo off
setlocal
cd /d "%~dp0"

title HTrainEoco
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" %*
set "HTRAINEOCO_EXIT_CODE=%ERRORLEVEL%"

if not "%HTRAINEOCO_EXIT_CODE%"=="0" (
  echo.
  echo HTrainEoco failed to start. Exit code: %HTRAINEOCO_EXIT_CODE%
  echo Keep the error message above for troubleshooting.
  pause
)

endlocal
