# Mobile Developer Handbook (VS Code + Physical Phone)

This handbook explains how to build, debug, and run the **Smart Solar Native Android Client** entirely from **VS Code and PowerShell**, without Android Studio.

---

## 1. Toolchain Architecture

The Android build toolchain consists of three headless components:

```
               ┌───────────────────────────────┐
               │         VS Code Editor        │
               │   (Java Extension / Terminal) │
               └───────────────┬───────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
   ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
   │   OpenJDK 17    │ │   Gradle 8.9   │ │  Android SDK   │
   │  (Adoptium/JBR) │ │  (Build Orche- │ │  CLI Tools     │
   │                 │ │   stration)    │ │ (adb, aapt2)   │
   └─────────────────┘ └────────────────┘ └────────────────┘
```

* **No Android Studio Required:** The IDE is just an editor wrapper; the build process is handled purely by Gradle invoking Java and Android SDK binaries.
* **Gradle Wrapper:** Compiles Java sources, resolves dependencies, merges Android manifests, and packages `.apk` bundles.
* **Android Debug Bridge (`adb`):** Communicates with the hardware device via USB daemon for APK installation, log streaming (`adb logcat`), and reverse socket forwarding.

---

## 2. Hardware Preparation (Physical Phone)

### Step 1: Enable Developer Options
1. On your Android phone, open **Settings**.
2. Scroll to **About Phone** (or **System Information**).
3. Tap **Build Number** 7 times rapidly.
4. You will see a toast notification: *"You are now a developer!"* (enter phone PIN if prompted).

### Step 2: Enable USB Debugging
1. Go back to **Settings** → **System** → **Developer Options** (on some phones: **Additional Settings** → **Developer Options**).
2. Find **USB Debugging** and toggle it **ON**.
3. *(Xiaomi / MIUI users only)*: Also enable **"Install via USB"** and **"USB debugging (Security settings)"**.

### Step 3: Connect via USB & Authorize
1. Connect your phone to your PC using a USB data cable (ensure the cable supports data, not charging only).
2. If prompted on the phone, select **File Transfer / Android Auto (MTP)** mode instead of "Charging Only".
3. A popup will appear on your phone: **"Allow USB debugging?"**.
4. Check **"Always allow from this computer"** and tap **Allow**.

---

## 3. Reverse Port Forwarding (`adb reverse`)

When testing locally, the Android app needs to communicate with the ASP.NET Core backend at `http://localhost:5205`.

Since the phone has its own network stack, `localhost` on the phone normally refers to the phone itself. To bridge this:

```powershell
adb reverse tcp:5205 tcp:5205
```

### What This Does:
1. `adb` instructs the Android OS to open a listening port on `tcp:5205` on the phone's loopback interface.
2. Whenever the mobile app connects to `http://127.0.0.1:5205`, `adbd` captures the traffic.
3. The traffic is tunneled through the USB cable and forwarded to port `5205` on your development PC.

This completely eliminates:
* Need to find and type your PC's local Wi-Fi IP address.
* Firewall blocks or IP changes when switching Wi-Fi networks.
* Campus / office router client-isolation policies.

---

## 4. Building & Running

### Using the Automated Helper
From repository root or `mobile/`:
```powershell
.\mobile\run-mobile.ps1
```

### Manual CLI Commands (Under the Hood)
If you wish to execute each step manually in your VS Code terminal:

1. **Check connected devices**:
   ```powershell
   adb devices
   ```
   *(Must show `<device_serial>   device`)*

2. **Setup reverse port tunnel**:
   ```powershell
   adb reverse tcp:5205 tcp:5205
   ```

3. **Build the Debug APK**:
   ```powershell
   cd mobile
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot"
   .\gradlew.bat assembleDebug
   ```

4. **Install to Phone**:
   ```powershell
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   ```

5. **Launch the App**:
   ```powershell
   adb shell am start -n com.sliit.smartsolar/.ui.LoginActivity
   ```

6. **View Realtime Device Logs**:
   ```powershell
   adb logcat -s "SmartSolar"
   ```

---

## 5. Configuration (`local.properties`)

In `mobile/local.properties` (kept out of version control):

```properties
sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
API_BASE_URL=http://127.0.0.1:5205
```

* `API_BASE_URL`: Defaults to `http://127.0.0.1:5205` when testing with USB cable. If running without USB over Wi-Fi, change to `http://<your-pc-ip>:5205`.
