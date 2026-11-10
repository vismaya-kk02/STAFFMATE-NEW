
# ================================================
# Staffmate CRM - Unified Local Development Startup
# ================================================

$frontend = "C:\Users\user\Downloads\staffmate-crm-feature-m0-unified-spa-wip (1)\staffmate-crm-feature-m0-unified-spa-wip\frontend"
$backend = "/home/user/projects/staffmate-crm/backend"
$reactPort = 5173

Write-Host ""
Write-Host "Starting Staffmate CRM..." -ForegroundColor Cyan

# 1. Verify frontend exists
if (-not (Test-Path "$frontend\package.json")) {
    Write-Host "ERROR: Unified React app not found." -ForegroundColor Red
    Write-Host "Expected: $frontend"
    return
}

# 2. Verify frontend dependencies
if (-not (Test-Path "$frontend\node_modules")) {
    Write-Host "ERROR: React dependencies are missing." -ForegroundColor Red
    Write-Host "Run npm install inside: $frontend"
    return
}

# 3. Verify backend directory in WSL
Write-Host "Checking Laravel backend..."

wsl.exe -d Ubuntu -- bash -lc "test -f '$backend/vendor/bin/sail'"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Laravel Sail not found in WSL." -ForegroundColor Red
    Write-Host "Expected: $backend"
    return
}

# 4. Start Laravel, PostgreSQL, Redis and Mailpit
Write-Host "Starting backend Docker services..." -ForegroundColor Yellow

wsl.exe -d Ubuntu -- bash -lc "cd '$backend' && ./vendor/bin/sail up -d"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Backend startup failed." -ForegroundColor Red
    Write-Host "Check Docker Desktop and WSL."
    return
}

Write-Host "Backend startup command completed." -ForegroundColor Green

# 5. Check React port
$used = Get-NetTCPConnection `
    -LocalPort $reactPort `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($used) {
    Write-Host ""
    Write-Host "Port $reactPort is already in use." -ForegroundColor Yellow
    Write-Host "React was not started to avoid a conflict."
    Write-Host "Check whether the unified or old frontend is running."
    return
}

# 6. Start unified React frontend
Write-Host "Starting unified React frontend..." -ForegroundColor Yellow

try {
    Start-Process `
        -FilePath "powershell.exe" `
        -WorkingDirectory $frontend `
        -ArgumentList @(
            "-NoExit",
            "-NoProfile",
            "-Command",
            "npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort"
        ) `
        -ErrorAction Stop
}
catch {
    Write-Host "ERROR: Could not launch React." -ForegroundColor Red
    Write-Host $_.Exception.Message
    return
}

# 7. Display local URLs
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Staffmate startup commands launched." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "React:   http://127.0.0.1:5173/"
Write-Host "Laravel: http://127.0.0.1/"
Write-Host "Mailpit: http://127.0.0.1:8025/"
Write-Host ""
Write-Host "Check the React window for Vite startup confirmation."
Write-Host "Keep the React PowerShell window open while testing."
