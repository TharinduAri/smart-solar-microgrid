<#
    -----------------------------------------------------------------------------
    Script      : start-all.ps1
    Project     : Smart Solar Microgrid Trading System
    Description : Complete All-In-One Orchestration Script.
                  1. Prepares environment and config files (.env, local.properties)
                  2. Starts MongoDB (Docker or native service) and waits for port 27017
                  3. Verifies and warms up the .NET 9 Web API on Windows IIS (port 5205)
                  4. Starts the React Web Portal in a titled window (port 5173)
                  5. Configures ADB reverse tunnel, builds, and launches the Android app on your phone
    Usage       : .\start-all.ps1
                  .\start-all.ps1 -NoMobile   (starts only MongoDB, Web API, and Web Portal)
                  .\start-all.ps1 -Publish    (re-publishes backend to IIS before starting)
    -----------------------------------------------------------------------------
#>

param(
    [switch]$NoMobile,
    [switch]$Publish
)

$ErrorActionPreference = "Continue"
$rootDir = $PSScriptRoot

function Header($title) {
    Write-Host "`n========================================================" -ForegroundColor DarkCyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor DarkCyan
}

function Step($name) {
    Write-Host "`n==> $name" -ForegroundColor Yellow
}

function Ok($text) {
    Write-Host "    [OK]   $text" -ForegroundColor Green
}

function Warn($text) {
    Write-Host "    [WARN] $text" -ForegroundColor DarkYellow
}

function Fail($text) {
    Write-Host "`nSTOPPED: $text" -ForegroundColor Red
    exit 1
}

Header "Smart Solar - All-In-One System Launcher"

# =============================================================================
# 1. Environment & Config Preparation
# =============================================================================
Step "1. Pre-flight checks & configuration preparation"

# Pre-Flight Runtime Verification (Fail-Fast)
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Fail "The .NET 9 SDK is not installed. Download and install it from: https://dotnet.microsoft.com/download"
}
$sdks = dotnet --list-sdks 2>&1 | Out-String
if ($sdks -notmatch "(?:9|10)\.\d+\.\d+") {
    Fail ".NET 9.x+ SDK was not detected. Please install .NET 9 SDK from: https://dotnet.microsoft.com/download"
}
Ok ".NET SDK verified"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Install Node.js 18+ from: https://nodejs.org"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail "npm is not installed. Install Node.js 18+ from: https://nodejs.org"
}
Ok "Node.js & npm verified"

# Configure Git hooks
if (Get-Command git -ErrorAction SilentlyContinue) {
    git config core.hooksPath .githooks 2>$null
    Ok "Git pre-commit hooks configured (.githooks)"
}

# Web .env
$webEnv = Join-Path $rootDir "web\.env"
if (-not (Test-Path $webEnv)) {
    "VITE_API_BASE_URL=http://localhost:5205" | Out-File $webEnv -Encoding utf8
    Ok "Created web/.env"
} else {
    Ok "web/.env found"
}

# Mobile local.properties
$mobileProps = Join-Path $rootDir "mobile\local.properties"
$sdkDefault = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-not (Test-Path $mobileProps)) {
    "sdk.dir=$($sdkDefault.Replace('\', '\\').Replace(':', '\:'))`r`nMAPS_API_KEY=`r`nAPI_BASE_URL=http://127.0.0.1:5205" | Out-File $mobileProps -Encoding ascii
    Ok "Created mobile/local.properties"
} else {
    Ok "mobile/local.properties found"
}

# =============================================================================
# 2. Database (MongoDB on port 27017)
# =============================================================================
Step "2. Checking Database (MongoDB on port 27017)"

$mongoCheck = Test-NetConnection -ComputerName "127.0.0.1" -Port 27017 -WarningAction SilentlyContinue
if ($mongoCheck.TcpTestSucceeded) {
    Ok "MongoDB is already running"
} else {
    Write-Host "    starting MongoDB..." -ForegroundColor Gray

    # Try Docker first
    $dockerFound = Get-Command docker -ErrorAction SilentlyContinue
    $startedWithDocker = $false

    if ($dockerFound) {
        $existingContainer = & docker ps -a --filter "name=^mongodb$" --format "{{.Names}}" 2>$null
        if ($existingContainer -eq "mongodb") {
            Write-Host "    restarting existing 'mongodb' container..." -ForegroundColor Gray
            & docker start mongodb | Out-Null
            $startedWithDocker = $true
        } else {
            Write-Host "    creating and starting 'mongodb' container..." -ForegroundColor Gray
            & docker run -d -p 27017:27017 --name mongodb mongo:latest | Out-Null
            $startedWithDocker = $true
        }
    }

    # If docker didn't start it, try native service
    if (-not $startedWithDocker) {
        Write-Host "    attempting to start native MongoDB service..." -ForegroundColor Gray
        net start MongoDB 2>$null | Out-Null
    }

    # Readiness polling: wait up to 15 seconds
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        $check = Test-NetConnection -ComputerName "127.0.0.1" -Port 27017 -WarningAction SilentlyContinue
        if ($check.TcpTestSucceeded) {
            $ready = $true
            break
        }
    }

    if ($ready) {
        Ok "MongoDB is up and healthy"
    } else {
        Fail "MongoDB could not be started on port 27017. Ensure Docker Desktop or MongoDB service is running."
    }
}

# =============================================================================
# 3. Central Web API on Windows IIS (Port 5205)
# =============================================================================
Step "3. Checking Central Web API on Windows IIS (Port 5205)"

$iisFolder = "C:\inetpub\SmartSolarApi"

# Optional re-publish if -Publish switch is passed
if ($Publish) {
    Write-Host "    -Publish requested: building and publishing to $iisFolder..." -ForegroundColor Gray
    dotnet publish (Join-Path $rootDir "backend\SmartSolar.Api") -c Release -o $iisFolder --nologo -v q
    Ok "Backend published to $iisFolder"
}

# Check if port 5205 is currently listening
$apiListening = Get-NetTCPConnection -LocalPort 5205 -State Listen -ErrorAction SilentlyContinue
if (-not $apiListening) {
    Write-Host "    port 5205 not active; attempting to start IIS site 'SmartSolarApi'..." -ForegroundColor Gray
    $appcmd = "$env:windir\system32\inetsrv\appcmd.exe"
    if (Test-Path $appcmd) {
        & $appcmd start site "SmartSolarApi" 2>$null | Out-Null
    }

    # Polling up to 10 seconds for IIS site to bind
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        $apiListening = Get-NetTCPConnection -LocalPort 5205 -State Listen -ErrorAction SilentlyContinue
        if ($apiListening) { break }
    }
}

if ($apiListening) {
    Write-Host "    warming up IIS application pool..." -ForegroundColor Gray
    $probe = Invoke-WebRequest -Uri "http://localhost:5205/" -UseBasicParsing -TimeoutSec 15 -ErrorAction SilentlyContinue
    if ($probe -and $probe.StatusCode -eq 200) {
        Ok "IIS Web API is healthy and live: http://localhost:5205/swagger"
    } else {
        Ok "Web API is listening on port 5205: http://localhost:5205/swagger"
    }
} else {
    Warn "IIS site 'SmartSolarApi' is not listening on port 5205."
    Warn "Ensure the site is created and started in IIS Manager (inetmgr), pointing to $iisFolder"
}

# =============================================================================
# 4. Web Portal Client (Port 5173)
# =============================================================================
Step "4. Checking Web Portal (Port 5173)"

$webListening = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($webListening) {
    Ok "Web Portal is already running on http://localhost:5173"
} else {
    Write-Host "    starting Web Portal (Vite) in a new window..." -ForegroundColor Gray
    $webLaunch = "-NoExit -Command ""Set-Location -LiteralPath '$rootDir\web'; `$host.UI.RawUI.WindowTitle = 'Smart Solar - Web Portal (Port 5173)'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"""
    Start-Process powershell -ArgumentList $webLaunch

    # Readiness polling: wait up to 20 seconds for Vite to serve
    $webReady = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
            $webReady = $true
            break
        }
    }

    if ($webReady) {
        Ok "Web Portal is live: http://localhost:5173"
    } else {
        Warn "Web Portal starting up. Check the Web Portal window for progress."
    }
}

# =============================================================================
# 5. Native Android Mobile App
# =============================================================================
if ($NoMobile) {
    Header "Services Live & Ready (No Mobile Requested)"
    Write-Host "  Web API Swagger : http://localhost:5205/swagger (IIS)" -ForegroundColor Green
    Write-Host "  Web Portal UI   : http://localhost:5173" -ForegroundColor Green
    Write-Host "`nSign in as Backoffice: admin@smartsolar.lk / Admin@123`n"
} else {
    Step "5. Launching Mobile Client on Physical Phone / Emulator"
    Write-Host "    Handing off to mobile launcher (run-mobile.ps1)...`n" -ForegroundColor Gray
    & (Join-Path $rootDir "mobile\run-mobile.ps1") -Yes -NoBackend
}
