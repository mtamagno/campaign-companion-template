$ErrorActionPreference = 'Stop'
$BotDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPython = Join-Path $BotDirectory '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $VenvPython)) {
    python -m venv (Join-Path $BotDirectory '.venv')
}

& $VenvPython -m pip install --disable-pip-version-check -r (Join-Path $BotDirectory 'requirements.txt')
& $VenvPython (Join-Path $BotDirectory 'bot.py')
