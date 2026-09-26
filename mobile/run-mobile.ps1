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

function Get-JavaMajorVersion($javaExe) {
    if (-not (Test-Path $javaExe)) { return $null }
    $verOutput = cmd.exe /c "`"$javaExe`" -version 2>&1" | Out-String
    if ($verOutput -match 'version "(?<ver>\d+)(\.|\+|-)?') {
        $v = [int]$matches['ver']
        if ($v -eq 1 -and $verOutput -match 'version "1\.(?<ver2>\d+)') {
            return [int]$matches['ver2']
        }
        return $v
    }
    return $null
}

# --- 1. Java -----------------------------------------------------------------
Step "Looking for Java (JDK 17 or 21 required)"
$javaCandidates = @()
if ($env:JAVA_HOME) { $javaCandidates += $env:JAVA_HOME }
$javaCandidates += "C:\Program Files\Android\Android Studio\jbr"
$javaCandidates += (Join-Path $cacheDir "jdk-17")
Get-ChildItem $cacheDir -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem $cacheDir -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }

# Common JDK install locations on Windows (Adoptium, Microsoft, Oracle)
Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Filter "jdk-21*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Microsoft" -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Microsoft" -Filter "jdk-21*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Java" -Filter "jdk-17*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }
Get-ChildItem "C:\Program Files\Java" -Filter "jdk-21*" -ErrorAction SilentlyContinue | ForEach-Object { $javaCandidates += $_.FullName }

$validJavaHome = $null
foreach ($cand in $javaCandidates) {
    if (-not $cand) { continue }
    $exe = Join-Path $cand "bin\java.exe"
    if (Test-Path $exe) {
        $maj = Get-JavaMajorVersion $exe
        if ($maj -ge 17 -and $maj -le 21) {
            $validJavaHome = $cand
            break
        }
    }
}

if (-not $validJavaHome) {
    Warn "Compatible Java (JDK 17 or 21) was not found."
    Say "    Android Gradle Plugin 8.7.3 requires Java 17 to 21 (Java 22+ is unsupported)."

    $installed = $false
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        if (Confirm-Step "Install Eclipse Temurin OpenJDK 17 via winget now?") {
            Say "    Installing OpenJDK 17 via winget..."
            & winget install --id EclipseAdoptium.Temurin.17.jdk -e --silent --accept-source-agreements --accept-package-agreements
            $adoptium = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Filter "jdk-17*" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($adoptium -and (Test-Path (Join-Path $adoptium.FullName "bin\java.exe"))) {
                $validJavaHome = $adoptium.FullName
                $installed = $true
            }
        }
    }

    if (-not $installed -and -not $validJavaHome) {
        if (Confirm-Step "Download portable OpenJDK 17 to $cacheDir ?") {
            New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
            $jdkZip = Join-Path $cacheDir "openjdk-17.zip"
            Say "    downloading OpenJDK 17 (about 180 MB)..."
            $jdkUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.12_7.zip"
            Invoke-WebRequest $jdkUrl -OutFile $jdkZip
            Say "    extracting OpenJDK 17..."
            Expand-Archive $jdkZip -DestinationPath $cacheDir -Force
            $extracted = Get-ChildItem $cacheDir -Directory -Filter "jdk-17*" | Select-Object -First 1
            if ($extracted) {
                $validJavaHome = $extracted.FullName
            }
        }
    }

    if (-not $validJavaHome) {
        Fail "No compatible Java 17/21 found. Please run: winget install EclipseAdoptium.Temurin.17.jdk"
    }
}

$env:JAVA_HOME = $validJavaHome
Ok "using Java ($env:JAVA_HOME)"

# --- 2. Android SDK ----------------------------------------------------------
Step "Looking for the Android SDK"
$sdkCandidates = @()
if ($env:ANDROID_HOME) { $sdkCandidates += $env:ANDROID_HOME }
if ($env:ANDROID_SDK_ROOT) { $sdkCandidates += $env:ANDROID_SDK_ROOT }

$localProps = Join-Path $mobileDir "local.properties"
if (Test-Path $localProps) {
    $sdkLine = Select-String -Path $localProps -Pattern "^\s*sdk\.dir\s*=" -ErrorAction SilentlyContinue
    if ($sdkLine) {
        $parsedSdk = ($sdkLine.Line -replace "^\s*sdk\.dir\s*=", "").Trim()
        $parsedSdk = $parsedSdk.Replace("\:", ":").Replace("\\", "\")
        # Ignore template placeholders like <you> or <YourUsername>
        if ($parsedSdk -notmatch "<.*>" -and $parsedSdk -match "^[A-Za-z]:\\") {
            $sdkCandidates += $parsedSdk
        }
    }
}
$sdkCandidates += "C:\Android\Sdk"
$sdkCandidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk")

$sdk = $null
foreach ($candidate in $sdkCandidates) {
    if ($candidate -and (Test-Path (Join-Path $candidate "platform-tools\adb.exe"))) {
        $sdk = $candidate
        break
    }
}
if (-not $sdk) {
    foreach ($candidate in $sdkCandidates) {
        $candidateSdkManager = Join-Path $candidate "cmdline-tools\latest\bin\sdkmanager.bat"
        if ($candidate -and (Test-Path $candidateSdkManager)) {
            $sdk = $candidate
            break
        }
    }
}

if (-not $sdk) {
    $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    Warn "No functional Android SDK found. It needs about 1 GB of downloads."
    if (-not (Confirm-Step "Download the Android SDK to $sdk ?")) { Fail "Cancelled." }

    $tools = Join-Path $cacheDir "cmdline-tools.zip"
    New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

    # Remove 0-byte or corrupted partial downloads from previous interruptions
    if ((Test-Path $tools) -and ((Get-Item $tools).Length -lt 10000000)) {
        Remove-Item $tools -Force
    }

    if (-not (Test-Path $tools)) {
        Say "    downloading the Android command line tools (about 150 MB)..."
        Invoke-WebRequest "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $tools
    }

    # Clean extract directory in cacheDir if present
    $extractedCmd = Join-Path $cacheDir "cmdline-tools"
    if (Test-Path $extractedCmd) { Remove-Item $extractedCmd -Recurse -Force }

    Say "    extracting command line tools..."
    Expand-Archive $tools -DestinationPath $cacheDir -Force

    # Place into $sdk\cmdline-tools\latest
    $destLatest = Join-Path $sdk "cmdline-tools\latest"
    if (Test-Path $destLatest) { Remove-Item $destLatest -Recurse -Force }
    New-Item -ItemType Directory -Force -Path (Split-Path $destLatest -Parent) | Out-Null
    Move-Item (Join-Path $cacheDir "cmdline-tools") $destLatest -Force
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
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        cmd.exe /c "for /l %i in (1,1,25) do @echo y" | cmd.exe /c "`"$sdkManager`" --sdk_root=`"$sdk`" --licenses" | Out-Null
        cmd.exe /c "`"$sdkManager`" --sdk_root=`"$sdk`" $($missing -join ' ')"
    }
    finally {
        $ErrorActionPreference = $prevEap
    }
}
Ok "SDK packages present"

# --- 4. local.properties -----------------------------------------------------
Step "Checking local.properties"
if (-not (Test-Path $localProps)) {
    "sdk.dir=$($sdk.Replace('\', '\\'))`r`nMAPS_API_KEY=`r`nAPI_BASE_URL=http://127.0.0.1:5205" | Out-File $localProps -Encoding ascii
    Warn "Created $localProps - default API_BASE_URL set to http://127.0.0.1:5205 (for physical phone via USB)."
    Warn "Add your MAPS_API_KEY in $localProps to use the map screen."
}
else {
    $keyLine = Select-String -Path $localProps -Pattern "^\s*MAPS_API_KEY\s*=\s*\S" -ErrorAction SilentlyContinue
    if (-not $keyLine) { Warn "MAPS_API_KEY is empty in local.properties - the map screen will be blank." }

    $apiLine = Select-String -Path $localProps -Pattern "^\s*API_BASE_URL\s*=" -ErrorAction SilentlyContinue
    if (-not $apiLine) {
        Add-Content -Path $localProps -Value "`r`nAPI_BASE_URL=http://127.0.0.1:5205"
        Say "    added API_BASE_URL=http://127.0.0.1:5205 to local.properties"
    }
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
Step "Looking for an Android phone or emulator"

# Check if an unauthorized physical device is connected
$unauth = (& $adb devices | Select-String "\tunauthorized$")
if ($unauth) {
    Warn "Android device detected, but unauthorized!"
    Say "    Please unlock your phone and tap 'Allow USB debugging' (check 'Always allow')."
    Say "    Waiting for authorization (up to 30 seconds)..."
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 2
        $devices = (& $adb devices | Select-String "\tdevice$")
        if ($devices) { break }
    }
}

$devices = (& $adb devices | Select-String "\tdevice$")
if (-not $devices) {
    $emulator = Join-Path $sdk "emulator\emulator.exe"
    $avds = @()
    if (Test-Path $emulator) { $avds = & $emulator -list-avds }

    if ($avds.Count -eq 0) {
        Fail @"
No Android phone is connected and no emulator exists.

To run on your actual Android phone:
  1. Enable Developer Options:
     Settings -> About Phone -> tap 'Build Number' 7 times.
  2. Enable USB Debugging:
     Settings -> System / Developer Options -> toggle 'USB Debugging' ON.
  3. Connect phone to PC using a USB data cable (select 'File Transfer' mode).
  4. Unlock your phone screen and tap 'Allow' when the 'Allow USB debugging?' popup appears.
  5. Run this script again!
"@
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

$deviceLine = (& $adb devices | Select-String '\tdevice$').Line
$deviceId = ($deviceLine -replace '\t.*','').Trim()
Ok "device ready: $deviceId"

# Configure ADB reverse port forwarding so physical phone can reach PC API via http://127.0.0.1:5205
Say "    configuring reverse port forwarding (port 5205)..."
& $adb reverse tcp:5205 tcp:5205 | Out-Null
Ok "reverse tunnel active: phone http://127.0.0.1:5205 -> PC localhost:5205"

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
