<#
    -----------------------------------------------------------------------------
    Script      : setup-dev.ps1
    Project     : Smart Solar Microgrid Trading System
    Description : One-stop fresh developer environment verification and onboarding
                  script. Checks prerequisites (.NET 9, Node.js, MongoDB, Java 17),
                  configures Git hooks, generates required local configs, and reports
                  readiness for VS Code development.
    Usage       : .\setup-dev.ps1
    -----------------------------------------------------------------------------
#>

param(
    [switch]$InstallMissing
)

$ErrorActionPreference = "Continue"
$rootDir = $PSScriptRoot

function Header($title) {
    Write-Host "`n========================================================" -ForegroundColor DarkCyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor DarkCyan
}

function Section($name) {
    Write-Host "`n[+] $name" -ForegroundColor Yellow
}

function Ok($text) {
    Write-Host "  [OK]   $text" -ForegroundColor Green
}

function Warn($text) {
    Write-Host "  [WARN] $text" -ForegroundColor DarkYellow
}

function Err($text) {
    Write-Host "  [FAIL] $text" -ForegroundColor Red
}

Header "Smart Solar - Developer Environment Doctor"

$allOk = $true

# 1. Check Git & activate hooks
Section "1. Git & Team Pre-Commit Hooks"
if (Get-Command git -ErrorAction SilentlyContinue) {
    Ok "Git is installed"
    git config core.hooksPath .githooks
    Ok "Pre-commit and commit-msg hooks activated (.githooks)"
} else {
    Err "Git is not installed or not in PATH."
    $allOk = $false
}

# 2. Check .NET 9 SDK
Section "2. Backend Runtime (.NET 9 SDK)"
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    $sdks = dotnet --list-sdks 2>&1 | Out-String
    if ($sdks -match "(?:9|10)\.\d+\.\d+") {
        Ok ".NET SDK detected ($($matches[0]))"
    } else {
        Warn ".NET SDK found, but .NET 9.x+ was not detected. Current SDKs:"
        Write-Host $sdks
        $allOk = $false
    }
} else {
    Err ".NET SDK not found. Install .NET 9 SDK from https://dotnet.microsoft.com/download"
    $allOk = $false
}

# 3. Check Node.js and npm
Section "3. Frontend Web Runtime (Node.js & npm)"
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Ok "Node.js detected ($nodeVer)"
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        $npmVer = npm -v
        Ok "npm detected ($npmVer)"
    }
} else {
    Err "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
    $allOk = $false
}

# 4. Check MongoDB
Section "4. Database (MongoDB on port 27017)"
$mongoConn = Test-NetConnection -ComputerName "127.0.0.1" -Port 27017 -WarningAction SilentlyContinue
if ($mongoConn.TcpTestSucceeded) {
    Ok "MongoDB is reachable on port 27017"
} else {
    Warn "MongoDB is NOT responding on port 27017."
    Write-Host "    If using Docker:  docker run -d -p 27017:27017 --name mongodb mongo:latest" -ForegroundColor Gray
    Write-Host "    If native service: net start MongoDB" -ForegroundColor Gray
}

# 5. Check Java 17 for Android
Section "5. Mobile Runtime (OpenJDK 17 for Android)"
function Get-JavaVersionNumber($javaExe) {
    if (-not (Test-Path $javaExe)) { return $null }
    $verOutput = & $javaExe -version 2>&1 | Out-String
    if ($verOutput -match 'version "(?<ver>\d+)(\.|\+|-)?') {
        return [int]$matches['ver']
    }
    return $null
}

$foundJava = $null
$javaCandidates = @()
if ($env:JAVA_HOME) { $javaCandidates += $env:JAVA_HOME }
$cacheDir = Join-Path $env:LOCALAPPDATA "SmartSolarTools"
$javaCandidates += (Join-Path $cacheDir "jdk-17")
Get-ChildItem $cacheDir -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Microsoft" -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Java" -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }

foreach ($cand in $javaCandidates) {
    if (-not $cand) { continue }
    $exe = Join-Path $cand "bin\java.exe"
    if (Test-Path $exe) {
        $maj = Get-JavaVersionNumber $exe
        if ($maj -ge 17 -and $maj -le 21) {
            $foundJava = $cand
            break
        }
    }
}

if ($foundJava) {
    Ok "Compatible OpenJDK ($maj) detected at $foundJava"
} else {
    Warn "No compatible OpenJDK 17 or 21 detected for Android Gradle builds."
    Write-Host "    Install via winget: winget install EclipseAdoptium.Temurin.17.jdk" -ForegroundColor Gray
    Write-Host "    Or run .\mobile\run-mobile.ps1 to let it auto-install." -ForegroundColor Gray
}

# 6. Check Configuration Files
Section "6. Environment Files & Local Configs"

# Web .env
$webEnv = Join-Path $rootDir "web\.env"
$webEnvExample = Join-Path $rootDir "web\.env.example"
if (Test-Path $webEnv) {
    Ok "web/.env exists"
} elseif (Test-Path $webEnvExample) {
    Copy-Item $webEnvExample $webEnv
    Ok "Created web/.env from web/.env.example"
} else {
    "VITE_API_BASE_URL=http://localhost:5205" | Out-File $webEnv -Encoding utf8
    Ok "Created default web/.env"
}

# Mobile local.properties
$mobileProps = Join-Path $rootDir "mobile\local.properties"
if (-not (Test-Path $mobileProps)) {
    $sdkDefault = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    "sdk.dir=$($sdkDefault.Replace('\', '\\').Replace(':', '\:'))`r`nMAPS_API_KEY=`r`nAPI_BASE_URL=http://127.0.0.1:5205" | Out-File $mobileProps -Encoding ascii
    Ok "Created default mobile/local.properties"
} else {
    Ok "mobile/local.properties exists"
}

# Summary
Header "Quickstart Commands for VS Code"
Write-Host "1. Start MongoDB:       docker run -d -p 27017:27017 --name mongodb mongo:latest"
Write-Host "2. Start Web API:       cd backend; dotnet run --project SmartSolar.Api --urls http://localhost:5205"
Write-Host "3. Start Web Portal:    cd web; npm install; npm run dev"
Write-Host "4. Start Mobile App:    .\mobile\run-mobile.ps1 (connect phone via USB first)"
Write-Host "`nDetailed documentation available in: docs\DEVELOPER_GUIDE.md`n" -ForegroundColor Green
