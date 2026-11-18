# AI-ATO Detection Platform - Windows Setup Script
# Run from project root: .\scripts\setup-windows.ps1

param(
    [switch]$SkipFrontend,
    [switch]$SkipML
)

$ErrorActionPreference = "Stop"

Write-Host "=== AI-ATO Detection Platform Setup ===" -ForegroundColor Cyan
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Gray

# --- Prerequisite checks ---
Write-Host "`n[Checking prerequisites...]" -ForegroundColor Yellow

# Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python not found. Install Python 3.11+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Node (optional)
if (-not $SkipFrontend) {
    try {
        $nodeVersion = node --version 2>&1
        Write-Host "  Node:   $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: Node.js not found. Skipping frontend setup." -ForegroundColor Yellow
        $SkipFrontend = $true
    }
}

# --- Backend setup ---
Write-Host "`n[1/5] Setting up backend..." -ForegroundColor Yellow
Push-Location backend

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  Created .env from .env.example" -ForegroundColor Green
    Write-Host "  IMPORTANT: Review backend\.env and update SECRET_KEY before use!" -ForegroundColor Yellow
} else {
    Write-Host "  .env already exists - skipping copy" -ForegroundColor Gray
}

Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pip install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  Backend dependencies installed" -ForegroundColor Green
Pop-Location

# --- Generate sample data ---
if (-not $SkipML) {
    Write-Host "`n[2/5] Generating sample ML data..." -ForegroundColor Yellow
    if (Test-Path "scripts\generate_sample_data.py") {
        python scripts\generate_sample_data.py
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: generate_sample_data.py failed" -ForegroundColor Yellow
        } else {
            Write-Host "  Sample data generated in ml-data\" -ForegroundColor Green
        }
    } else {
        Write-Host "  scripts\generate_sample_data.py not found - skipping" -ForegroundColor Yellow
    }

    # --- Train ML model ---
    Write-Host "`n[3/5] Training ML model..." -ForegroundColor Yellow
    if (Test-Path "scripts\train_model.py") {
        python scripts\train_model.py
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: train_model.py failed — start backend without ML model" -ForegroundColor Yellow
        } else {
            Write-Host "  Model trained and saved to backend\models\" -ForegroundColor Green
        }
    } else {
        Write-Host "  scripts\train_model.py not found - skipping" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[2/5] Skipping ML data generation (--SkipML)" -ForegroundColor Gray
    Write-Host "`n[3/5] Skipping model training (--SkipML)" -ForegroundColor Gray
}

# --- Frontend setup ---
if (-not $SkipFrontend) {
    Write-Host "`n[4/5] Setting up frontend..." -ForegroundColor Yellow
    Push-Location frontend
    npm install --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: npm install failed" -ForegroundColor Yellow
    } else {
        Write-Host "  Frontend dependencies installed" -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "`n[4/5] Skipping frontend setup (--SkipFrontend)" -ForegroundColor Gray
}

# --- Database initialization ---
Write-Host "`n[5/5] Initializing database..." -ForegroundColor Yellow
Push-Location backend
python -c "from app.database.init_db import init_db; init_db()" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Database initialized" -ForegroundColor Green
} else {
    Write-Host "  WARNING: DB init failed — may need manual init on first backend start" -ForegroundColor Yellow
}
Pop-Location

# --- Summary ---
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTo start the application:" -ForegroundColor Cyan
Write-Host "  Terminal 1 (backend):"
Write-Host "    cd backend"
Write-Host "    uvicorn app.main:app --reload --port 8000"
Write-Host ""
Write-Host "  Terminal 2 (frontend):"
Write-Host "    cd frontend"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "Default URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:   http://localhost:5173"
Write-Host "  Backend:    http://localhost:8000"
Write-Host "  API Docs:   http://localhost:8000/docs"
Write-Host "  Admin UI:   http://localhost:5173  (login with seeded demo credentials)"
Write-Host ""
Write-Host "Demo credentials (local dev ONLY — never use in production):" -ForegroundColor Yellow
Write-Host "  admin@example.com / Admin123!"
Write-Host "  analyst@example.com / Analyst123!"
Write-Host "  user@example.com / User123!"
