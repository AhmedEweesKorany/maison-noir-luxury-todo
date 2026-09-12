@echo off
REM ◆ MAISON NOIR launcher for Windows
REM Reuses the running server if :47329 answers, else starts it, then opens the browser.
set PORT=47329
curl -fs -o NUL --max-time 2 http://127.0.0.1:%PORT%/ 2>NUL
if errorlevel 1 (
  echo Igniting the maison on :%PORT% ...
  start "Maison Noir" /min pythonw "%~dp0server.py" -p %PORT% --no-browser
  timeout /t 2 /nobreak >NUL
)
start "" http://127.0.0.1:%PORT%/
