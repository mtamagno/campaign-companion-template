$ErrorActionPreference = 'Stop'
$ProjectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectDirectory

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js non è installato. Scarica Node.js 24 da https://nodejs.org/' -ForegroundColor Red
    Read-Host 'Premi Invio per chiudere'
    exit 1
}

node tools/campaign-manager/server.mjs --open
