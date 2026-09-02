# CourseForge - Stop Full Development Environment
# Stops: Docker Containers (Mongo, Redis, API, Worker), Stripe Webhook Listener, and Client Dev Server

$ProjectRoot = $PSScriptRoot
$ServerDir = Join-Path $ProjectRoot "server"

Write-Host "=========================================" -ForegroundColor Magenta
Write-Host " 🛑 Stopping CourseForge Development Env " -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta

# 1. Stop Stripe CLI processes
Write-Host "`n[1/3] 💳 Stopping Stripe CLI process..." -ForegroundColor Yellow
$stripeProcesses = Get-Process stripe -ErrorAction SilentlyContinue
if ($stripeProcesses) {
    $stripeProcesses | Stop-Process -Force
    Write-Host "  -> Stripe CLI stopped." -ForegroundColor Green
} else {
    Write-Host "  -> No running Stripe CLI process found." -ForegroundColor Gray
}

# 2. Stop Docker Services
Write-Host "`n[2/3] 🐳 Stopping Docker Services..." -ForegroundColor Yellow
Push-Location $ServerDir
try {
    docker compose -f docker-compose.dev.yml down
    Write-Host "  -> Docker containers stopped and removed." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Error stopping Docker containers." -ForegroundColor DarkYellow
}
Pop-Location

# 3. Terminate Dev Server Windows (node processes spawned in client directory / ports)
Write-Host "`n[3/3] 💻 Cleaning up Frontend Dev Server windows..." -ForegroundColor Yellow
# Stop powershell windows opened for CourseForge
Get-Process powershell, pwsh -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.MainWindowTitle -like "CourseForge*") {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  -> Closed window: $($_.MainWindowTitle)" -ForegroundColor Green
    }
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " 🏁 All CourseForge services stopped." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
