<#
    -----------------------------------------------------------------------------
    Script      : run-mobile.ps1
    Project     : Smart Solar Microgrid Trading System - Android Client
    Description : First launch helper. Checks everything the Android app needs,
                  installs whatever is missing (SDK packages, Gradle), starts an
                  emulator and the Web API, then builds, installs and opens the
                  app. Run it from PowerShell:  .\run-mobile.ps1
    -----------------------------------------------------------------------------
#>

param(
    # Skip every confirmation prompt (downloads start automatically).
    [switch]$Yes,
    # Do not start the C# Web API, e.g. when it is already running elsewhere.
    [switch]$NoBackend
)

$ErrorActionPreference = "Stop"
$mobileDir = $PSScriptRoot
$repoDir = Split-Path $mobileDir -Parent
$cacheDir = Join-Path $env:LOCALAPPDATA "SmartSolarTools"

function Say($text) { Write-Host $text }
function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "    OK  $text" -ForegroundColor Green }
function Warn($text) { Write-Host "    !   $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "`nSTOPPED: $text" -ForegroundColor Red; exit 1 }

# True when Windows has reserved the port, which stops anything binding to it.
function Test-PortBlockedByWindows($port) {
    $ranges = netsh interface ipv4 show excludedportrange protocol=tcp
    foreach ($line in $ranges) {
        if ($line -match "^\s*(\d+)\s+(\d+)\s*\*?\s*$") {
            if ([int]$matches[1] -le $port -and $port -le [int]$matches[2]) { return $true }
        }
    }
    return $false
}

# Asks before a large download unless -Yes was passed.
function Confirm-Step($question) {
    if ($Yes) { return $true }
    $answer = Read-Host "$question [y/N]"
    return ($answer -eq "y" -or $answer -eq "Y")
}

Say "Smart Solar - Android first launch"
Say "=================================="

# --- 1. Java -----------------------------------------------------------------
Step "Looking for Java"
$studioJbr = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path (Join-Path $studioJbr "bin\java.exe")) {
    $env:JAVA_HOME = $studioJbr
    Ok "using the Java bundled with Android Studio"
}
elseif ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    Ok "using JAVA_HOME ($env:JAVA_HOME)"
}
else {
    Fail "No Java found. Install Android Studio (it includes Java), then run this again."
}

# --- 2. Android SDK ----------------------------------------------------------
Step "Looking for the Android SDK"
$sdkCandidates = @()
if ($env:ANDROID_HOME) { $sdkCandidates += $env:ANDROID_HOME }
if ($env:ANDROID_SDK_ROOT) { $sdkCandidates += $env:ANDROID_SDK_ROOT }

$localProps = Join-Path $mobileDir "local.properties"
if (Test-Path $localProps) {
    $sdkLine = Select-String -Path $localProps -Pattern "^\s*sdk\.dir\s*=" -ErrorAction SilentlyContinue
    if ($sdkLine) {
        $sdkCandidates += ($sdkLine.Line -replace "^\s*sdk\.dir\s*=", "").Trim().Replace("\\", "\")
    }
}
$sdkCandidates += "C:\Android\Sdk"
$sdkCandidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk")

$sdk = $null
foreach ($candidate in $sdkCandidates) {
    if ($candidate -and (Test-Path (Join-Path $candidate "platform-tools\adb.exe"))) { $sdk = $candidate; break }
}
if (-not $sdk) {
    foreach ($candidate in $sdkCandidates) {
        if ($candidate -and (Test-Path $candidate)) { $sdk = $candidate; break }
    }
}

if (-not $sdk) {
    $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    Warn "No Android SDK found. It needs about 1 GB of downloads."
    if (-not (Confirm-Step "Download the Android SDK to $sdk ?")) { Fail "Cancelled." }

    $tools = Join-Path $cacheDir "cmdline-tools.zip"
    New-Item -ItemType Directory -Force -Path $cacheDir, (Join-Path $sdk "cmdline-tools") | Out-Null
    Say "    downloading the Android command line tools..."
    Invoke-WebRequest "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $tools
    Expand-Archive $tools -DestinationPath $cacheDir -Force
    Move-Item (Join-Path $cacheDir "cmdline-tools") (Join-Path $sdk "cmdline-tools\latest") -Force
}
Ok "SDK at $sdk"

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$adb = Join-Path $sdk "platform-tools\adb.exe"

# --- 3. SDK packages ---------------------------------------------------------
Step "Checking the SDK packages the app needs"
$sdkManager = Get-ChildItem -Path $sdk -Filter "sdkmanager.bat" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

$missing = @()
if (-not (Test-Path (Join-Path $sdk "platforms\android-35"))) { $missing += "platforms;android-35" }
if (-not (Test-Path (Join-Path $sdk "build-tools"))) { $missing += "build-tools;35.0.0" }
if (-not (Test-Path $adb)) { $missing += "platform-tools" }

if ($missing.Count -gt 0) {
    if (-not $sdkManager) { Fail "Missing $($missing -join ', ') and sdkmanager was not found. Install them in Android Studio (Tools > SDK Manager)." }
    Warn "Missing: $($missing -join ', ')"
    if (-not (Confirm-Step "Download them now?")) { Fail "Cancelled." }
    Say "y" | & $sdkManager "--sdk_root=$sdk" "--licenses" | Out-Null
    & $sdkManager "--sdk_root=$sdk" $missing
}
Ok "SDK packages present"

# --- 4. local.properties -----------------------------------------------------
Step "Checking local.properties"
if (-not (Test-Path $localProps)) {
    "sdk.dir=$($sdk.Replace('\', '\\'))`r`nMAPS_API_KEY=" | Out-File $localProps -Encoding ascii
    Warn "Created $localProps - add your MAPS_API_KEY to use the map screen."
}
else {
    $keyLine = Select-String -Path $localProps -Pattern "^\s*MAPS_API_KEY\s*=\s*\S" -ErrorAction SilentlyContinue
    if (-not $keyLine) { Warn "MAPS_API_KEY is empty in local.properties - the map screen will be blank." }
    Ok "local.properties found"
}

# --- 5. Gradle ---------------------------------------------------------------
Step "Looking for Gradle"
$gradleCmd = $null
if (Test-Path (Join-Path $mobileDir "gradlew.bat")) {
    $gradleCmd = Join-Path $mobileDir "gradlew.bat"
    Ok "using the Gradle wrapper in this project"
}
else {
    $gradleHome = Join-Path $cacheDir "gradle-8.9"
    if (-not (Test-Path (Join-Path $gradleHome "bin\gradle.bat"))) {
        Warn "Gradle is not installed (about 130 MB)."
        if (-not (Confirm-Step "Download Gradle 8.9 to $cacheDir ?")) { Fail "Cancelled." }
        New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
        $zip = Join-Path $cacheDir "gradle.zip"
        Say "    downloading Gradle 8.9..."
        Invoke-WebRequest "https://services.gradle.org/distributions/gradle-8.9-bin.zip" -OutFile $zip
        Expand-Archive $zip -DestinationPath $cacheDir -Force
    }
    $gradleCmd = Join-Path $gradleHome "bin\gradle.bat"
    Ok "using Gradle at $gradleHome"
}

# --- 6. A phone or emulator --------------------------------------------------
Step "Looking for a phone or emulator"
$devices = (& $adb devices | Select-String "\tdevice$")
if (-not $devices) {
    $emulator = Join-Path $sdk "emulator\emulator.exe"
    $avds = @()
    if (Test-Path $emulator) { $avds = & $emulator -list-avds }

    if ($avds.Count -eq 0) {
        Fail "No device is connected and no emulator exists.`n  Create one in Android Studio: Device Manager > Create Virtual Device > Pixel 7 > API 35.`n  Or plug in a phone with USB debugging turned on, then run this again."
    }

    $avd = $avds[0]
    Say "    starting the emulator '$avd' (this takes a minute)..."
    Start-Process -FilePath $emulator -ArgumentList "-avd", $avd | Out-Null
    & $adb wait-for-device
    for ($i = 0; $i -lt 90; $i++) {
        $booted = (& $adb shell getprop sys.boot_completed 2>$null)
        if ($booted -match "1") { break }
        Start-Sleep -Seconds 2
    }
}
Ok "device ready: $((& $adb devices | Select-String '\tdevice$').Line -replace '\t.*','')"

# The app calls http://127.0.0.1:5205; forward that port over USB to the Web API on this PC.
& $adb reverse tcp:5205 tcp:5205 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "port 5205 forwarded to this PC (adb reverse)" }
else { Warn "adb reverse failed - the app will not reach the Web API." }

# --- 7. The Web API ----------------------------------------------------------
if (-not $NoBackend) {
    Step "Checking the Web API on port 5205"
    $listening = Get-NetTCPConnection -LocalPort 5205 -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        Ok "already running"
    }
    elseif (Test-PortBlockedByWindows 5205) {
        Warn "Windows has reserved port 5205, so the Web API cannot start."
        Say "    Fix it once, in a PowerShell window opened as Administrator:"
        Say "      net stop winnat"
        Say "      netsh int ipv4 add excludedportrange protocol=tcp startport=5205 numberofports=1 store=persistent"
        Say "      net start winnat"
        Say "    That keeps port 5205 free for this project. Then run this script again."
    }
    else {
        Say "    starting it in a new window..."
        # One quoted string, so the space in the folder path does not split the command.
        $launch = "-NoExit -Command ""Set-Location -LiteralPath '$repoDir\backend'; dotnet run --project SmartSolar.Api --urls http://localhost:5205"""
        Start-Process powershell -ArgumentList $launch
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 2
            if (Get-NetTCPConnection -LocalPort 5205 -State Listen -ErrorAction SilentlyContinue) { break }
        }
        if (Get-NetTCPConnection -LocalPort 5205 -State Listen -ErrorAction SilentlyContinue) {
            Ok "Web API started"
        }
        else {
            Warn "The Web API did not start. Check the new window - MongoDB may not be running."
        }
    }
}

# --- 8. Build, install, launch -----------------------------------------------
Step "Building the app (the first build takes a few minutes)"
Push-Location $mobileDir
try {
    & $gradleCmd assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { Fail "The build failed. The errors are listed above." }
}
finally {
    Pop-Location
}
Ok "build finished"

Step "Installing on the device"
& $adb install -r (Join-Path $mobileDir "app\build\outputs\apk\debug\app-debug.apk")
if ($LASTEXITCODE -ne 0) { Fail "Install failed." }

Step "Starting Smart Solar"
# Start-Process keeps adb's progress text from being reported as a PowerShell error.
Start-Process -FilePath $adb -NoNewWindow -Wait -ArgumentList `
    "shell", "am", "start", "-n", "com.sliit.smartsolar/.ui.LoginActivity"

Say "`nDone. The app is running on the device."
Say ""
Say "Sign in as:"
Say "  Prosumer       kamal@solar.lk        Prosumer@123"
Say "  Grid Operator  operator@smartsolar.lk Operator@123"
Say ""
Say "Those accounts only exist if the database was seeded. If sign in fails,"
Say "drop the SmartSolarDb database in MongoDB Compass and restart the Web API."
