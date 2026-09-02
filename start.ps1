# CourseForge - Start Full Development Environment
# Starts: Docker Containers (Mongo, Redis, API, Worker), Stripe Webhook Listener (optional/auto), and Client Dev Server

param (
    [switch]$NoStripe,
    [switch]$NoClient
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$ServerDir = Join-Path $ProjectRoot "server"
$ClientDir = Join-Path $ProjectRoot "client"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " 🚀 Starting CourseForge Development Env " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start Docker Containers (MongoDB, Redis, API, Worker)
Write-Host "`n[1/3] Starting Docker Services..." -ForegroundColor Yellow
Push-Location $ServerDir
try {
    docker compose -f docker-compose.dev.yml up -d
    Write-Host "  -> Docker services started successfully." -ForegroundColor Green
} catch {
    Write-Host "  Failed to start Docker services. Make sure Docker Desktop is running." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 2. Check and Launch Stripe Webhook Forwarder
if (-not $NoStripe) {
    Write-Host "`n[2/3] Checking Stripe CLI..." -ForegroundColor Yellow
    $stripeCmd = Get-Command stripe -ErrorAction SilentlyContinue
    if ($stripeCmd) {
        Write-Host "  -> Starting Stripe CLI webhook listener in background window..." -ForegroundColor Green
        $stripeScript = @"
`$host.UI.RawUI.WindowTitle = 'CourseForge - Stripe Webhook Forwarder'
Write-Host 'Forwarding Stripe webhooks to http://localhost:8080/api/v1/payments/webhook' -ForegroundColor Cyan
stripe listen --forward-to localhost:8080/api/v1/payments/webhook
"@
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $stripeScript
    } else {
        Write-Host "  Stripe CLI not found on PATH. Skipping Stripe webhook listener." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "`n[2/3] Skipping Stripe CLI (-NoStripe specified)." -ForegroundColor Gray
}

# 3. Start Frontend Client Dev Server
if (-not $NoClient) {
    Write-Host "`n[3/3] Starting Client Dev Server..." -ForegroundColor Yellow
    $clientScript = @"
`$host.UI.RawUI.WindowTitle = 'CourseForge - Client Dev Server'
Set-Location '$ClientDir'
Write-Host 'Starting Frontend on http://localhost:5173...' -ForegroundColor Cyan
pnpm dev
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientScript
    Write-Host "  -> Client server launched in new window." -ForegroundColor Green
} else {
    Write-Host "`n[3/3] Skipping Client (-NoClient specified)." -ForegroundColor Gray
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " CourseForge is running!" -ForegroundColor Green
Write-Host " - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " - Backend API: http://localhost:8080" -ForegroundColor White
Write-Host " - MongoDB: localhost:27017" -ForegroundColor White
Write-Host " - Redis: localhost:6379" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Run .\stop.ps1 anytime to shut down all services." -ForegroundColor Gray
