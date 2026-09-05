# =============================================================
#  Vehicle Repair Management System - Windows DEV launcher
#
#  Starts the Backend API and the Admin Dashboard in two separate
#  terminal windows and prints the URLs to open.
#
#  Usage (from the project root):
#     powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
#  or simply:
#     .\start-dev.ps1
#
#  First run automatically creates the local embedded database
#  (backend/.localdb via PGlite) and seeds demo data.
#  No PostgreSQL installation is required for development.
# =============================================================

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$dashboard = Join-Path $root 'dashboard'
$localDb = Join-Path $backend '.localdb'
$apiUrl = 'http://localhost:8080'
$dashUrl = 'http://localhost:5173'

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  Vehicle Repair Management System - DEV' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

# ---------- 1) Backend dependencies ----------
if (-not (Test-Path (Join-Path $backend 'node_modules'))) {
    Write-Host '[1/4] Installing backend dependencies...' -ForegroundColor Yellow
    Push-Location $backend
    npm install
    Pop-Location
} else {
    Write-Host '[1/4] Backend dependencies present.' -ForegroundColor Green
}

# ---------- 2) Dashboard dependencies ----------
if (-not (Test-Path (Join-Path $dashboard 'node_modules'))) {
    Write-Host '[2/4] Installing dashboard dependencies...' -ForegroundColor Yellow
    Push-Location $dashboard
    npm install
    Pop-Location
} else {
    Write-Host '[2/4] Dashboard dependencies present.' -ForegroundColor Green
}

# ---------- 3) Local database (embedded, zero install) ----------
if (-not (Test-Path $localDb)) {
    Write-Host '[3/4] First run - creating local database and seed data...' -ForegroundColor Yellow
    Push-Location $backend
    npm run migrate
    if ($LASTEXITCODE -ne 0) { Write-Host '  Migration failed - check the terminal output above.' -ForegroundColor Red; Pop-Location; exit 1 }
    npm run seed
    if ($LASTEXITCODE -ne 0) { Write-Host '  Seed failed - check the terminal output above.' -ForegroundColor Red; Pop-Location; exit 1 }
    Pop-Location
} else {
    Write-Host '[3/4] Local database found.' -ForegroundColor Green
}

# ---------- 4) Launch backend + dashboard ----------
Write-Host '[4/4] Starting services...' -ForegroundColor Yellow

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd -LiteralPath '$backend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd -LiteralPath '$dashboard'; npm run dev"

# Wait for the backend to answer on /health
$ready = $false
Write-Host '  Waiting for backend...' -ForegroundColor Yellow
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $null = Invoke-RestMethod "$apiUrl/health" -TimeoutSec 2
        $ready = $true
        break
    } catch {
        # not up yet
    }
}

Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host '  System is starting up.' -ForegroundColor Green
Write-Host '----------------------------------------------'
if ($ready) {
    Write-Host ("  Backend API      : " + $apiUrl + "/health") -ForegroundColor Green
} else {
    Write-Host ("  Backend API      : " + $apiUrl + "/health  (still booting - refresh in a few seconds)") -ForegroundColor Yellow
}
Write-Host ("  API base URL     : " + $apiUrl + "/api/v1") -ForegroundColor Green
Write-Host ("  Admin Dashboard  : " + $dashUrl) -ForegroundColor Green
Write-Host ''
Write-Host '  Login:  admin@workshop.com  /  Admin@123' -ForegroundColor Cyan
Write-Host '----------------------------------------------'
Write-Host '  Stop:  close the two terminal windows that opened (Ctrl+C inside them).' -ForegroundColor DarkGray
Write-Host '==============================================' -ForegroundColor Green
Write-Host ''

# =============================================================
#  PRODUCTION (PostgreSQL) — deployment only:
#    backend/.env :
#       DB_DRIVER=postgres
#       DATABASE_URL=postgres://user:pass@host:5432/repair_workshop
#    then:  npm run migrate && npm run seed && npm start   (in backend/)
#    dashboard:  npm run build  -> serve dashboard/dist/
#    Android:    flutter build apk --dart-define=API_BASE_URL=https://api.your-domain.com/api/v1
# =============================================================