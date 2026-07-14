$ErrorActionPreference = "Stop"

# Python on Windows can otherwise inherit a legacy console encoding (for
# example cp1252). That breaks pip and application logging when the repository
# path contains Vietnamese characters.
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
Set-Location $backend

if (-not (Test-Path ".venv")) {
    Write-Host "Creating image-service virtual environment..."
    python -m venv .venv
    & ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
    & ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
}

if (-not (Test-Path (Join-Path $root ".env"))) {
    Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env")
    Write-Host "Created services/image-factory/.env"
}

Write-Host "Starting integrated thumbnail service at http://127.0.0.1:8000"
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
