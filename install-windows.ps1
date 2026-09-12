# ◆ MAISON NOIR — Windows Start Menu shortcut installer
# RUN THIS ON WINDOWS (right-click > "Run with PowerShell"):
#   1. Copy the whole maison-noir-luxury-todo folder to your PC
#   2. Install Python 3 from python.org (tick "Add python.exe to PATH")
#   3. Right-click install-windows.ps1 > "Run with PowerShell"
#   4. Press Win, type:  maison todo
$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $appDir 'launch.bat'
if (-not (Test-Path $target)) { Write-Error "launch.bat not found in $appDir"; exit 1 }

$lnkDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$lnk = Join-Path $lnkDir 'Maison Todo.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = $target
$sc.WorkingDirectory = $appDir
$sc.Description = 'MAISON NOIR luxury todo atelier (browser, port 47329)'
$ico = Join-Path $appDir 'assets\icon.ico'
if (Test-Path $ico) { $sc.IconLocation = $ico }
$sc.Save()

Write-Host "Installed: $lnk"
Write-Host "Press Win, type 'maison todo' and hit Enter."
Write-Host "To remove: delete 'Maison Todo' from the Start Menu Programs folder."
