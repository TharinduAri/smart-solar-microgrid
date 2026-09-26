# Developer Guide — Smart Solar Microgrid Trading System

Welcome to the **Smart Solar Microgrid Trading System**! This guide is written for engineers onboarding onto this repository using **VS Code and command-line tools** without requiring heavy monolithic IDEs like Android Studio.

---

## 1. System Architecture & Port Reference

The system consists of 4 decoupled components communicating over standard REST/JSON protocols:

```
                       ┌─────────────────────────┐
                       │  MongoDB NoSQL Server   │
                       │     (Port: 27017)       │
                       └───────────▲─────────────┘
                                   │
                                   │ TCP Connection
                                   │
                       ┌───────────▼─────────────┐
                       │   ASP.NET Core Web API  │
                       │     (.NET 9, Port: 5205)│
                       └─────▲─────────────▲─────┘
                             │             │
              HTTP / REST    │             │  HTTP / REST over USB Reverse Tunnel
             (port 5205)     │             │  (adb reverse tcp:5205 tcp:5205)
                             │             │
               ┌─────────────▼───┐     ┌───▼─────────────────────┐
               │ React 18 Portal │     │  Native Android Client  │
               │  (Port: 5173)   │     │ (Physical Device / USB) │
               │   (Backoffice)  │     │       (Prosumer)        │
               └─────────────────┘     └─────────────────────────┘
```

### Port & Service Cheat Sheet

| Service | Technology | Default URL / Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | MongoDB 7.0+ | `mongodb://localhost:27017` | Central NoSQL document store (4 collections) |
| **Web API** | ASP.NET Core (.NET 9) | `http://localhost:5205` | FAT central business logic & REST API |
| **API Docs** | Swagger UI | `http://localhost:5205/swagger` | OpenAPI testing & live documentation |
| **Web Portal** | React 18 + Vite | `http://localhost:5173` | Backoffice & Grid Operator administration |
| **Mobile App**| Pure Native Android (Java 17)| Physical Phone via USB | Prosumer energy trading, Google Maps, QR tokens |

---

## 2. Seeded Account Credentials

When the Web API starts against a clean database, `DatabaseSeeder` automatically provisions seed accounts:

| Role | Email / Identifier | Password | Scope & Actions |
| :--- | :--- | :--- | :--- |
| **Backoffice** | `admin@smartsolar.lk` | `Admin@123` | Active. Manage prosumers, approve accounts, view stations. |
| **Grid Operator** | `operator@smartsolar.lk` | `Operator@123` | Active. Station slot management on Web & QR scan on Mobile. |
| **Prosumer (Active)** | `kamal@solar.lk`<br>(NIC: `198512345678`) | `Prosumer@123` | Active. Android client user with approved energy reservation. |
| **Prosumer (Pending)** | `nimal@solar.lk`<br>(NIC: `199087654321`) | `Prosumer@123` | **Pending**. Used to test the Backoffice activation workflow. |

---

## 3. Prerequisites Checklist

Ensure your development machine has the following tools installed:

1. **Git for Windows** ([git-scm.com](https://git-scm.com/))
2. **.NET 9 SDK** ([dotnet.microsoft.com/download](https://dotnet.microsoft.com/en-us/download/dotnet/9.0))
3. **Node.js (LTS 18+) & npm** ([nodejs.org](https://nodejs.org/))
4. **MongoDB** (Docker Desktop or MongoDB Community Server MSI)
5. **OpenJDK 17** (e.g. Eclipse Adoptium Temurin 17: `winget install EclipseAdoptium.Temurin.17.jdk`)
6. **Physical Android Phone** with USB cable (or Android Emulator)

---

## 4. Quickstart: All-In-One Launcher & Doctor

You have two convenience scripts at the repository root:

### Option A: Complete System Auto-Launcher (`start-all.ps1`)
Starts the entire stack in one command with automated health-polling between dependent services:
```powershell
.\start-all.ps1
```
* Prepares environment & config files (`.env`, `local.properties`).
* Intelligently starts MongoDB (`docker start mongodb` if exists, or `docker run`).
* Waits for port 27017, then boots the .NET Web API in a titled window.
* Waits for port 5205, then boots the React Web Portal in a titled window.
* Sets up ADB reverse socket forwarding, compiles, and launches the Android app on your phone.
*(To start without mobile: `.\start-all.ps1 -NoMobile`)*

### Option B: Environment Doctor Only (`setup-dev.ps1`)
To inspect prerequisite runtimes without launching the services:
```powershell
.\setup-dev.ps1
```

---

## 5. Starting the Services (Step-by-Step)

Follow this order when starting the system from scratch:

```
Step 1: MongoDB  ──►  Step 2: Web API  ──►  Step 3: Web Portal  ──►  Step 4: Mobile App
```

### Step 1: Database (MongoDB)

#### Option A: Docker (Recommended)
```powershell
docker run -d -p 27017:27017 --name mongodb mongo:latest
```
*(To restart later: `docker start mongodb`)*

#### Option B: Native Windows Service
```powershell
net start MongoDB
```

---

### Step 2: Central Web API (`backend/`)

1. Open PowerShell and navigate to `backend/`:
   ```powershell
   cd backend
   dotnet restore
   dotnet run --project SmartSolar.Api --urls http://localhost:5205
   ```
2. Verify API status in your browser:
   - **Swagger UI**: [http://localhost:5205/swagger](http://localhost:5205/swagger)

---

### Step 3: Web Portal Client (`web/`)

1. Open a new PowerShell terminal in `web/`:
   ```powershell
   cd web
   npm install
   npm run dev
   ```
2. Open [http://localhost:5173](http://localhost:5173) in your browser.
3. Sign in as `admin@smartsolar.lk` (password: `Admin@123`).

---

### Step 4: Native Android Client (`mobile/`) on Physical Phone

You **do not need Android Studio**. You build, deploy, and launch directly from VS Code terminal onto an actual Android phone.

#### 1. Prepare Your Phone (One-Time Setup)
1. **Enable Developer Options**: Go to phone **Settings** → **About Phone** → Tap **Build Number** 7 times until you see *"You are now a developer!"*.
2. **Enable USB Debugging**: Go to **Settings** → **System** → **Developer Options** → Toggle **USB Debugging** to **ON**.
3. **Connect to PC**: Plug your phone into your computer using a USB data cable.
4. **Authorize Computer**: Unlock your phone screen. When the popup **"Allow USB debugging?"** appears, check **"Always allow from this computer"** and tap **Allow**.

#### 2. Run the Automated Launcher
In PowerShell:
```powershell
.\mobile\run-mobile.ps1
```

The script will automatically:
- Locate or install OpenJDK 17.
- Download the lightweight Android command-line tools and platform SDK (if missing).
- Detect your connected phone via `adb`.
- Set up **ADB Reverse Socket Forwarding** (`adb reverse tcp:5205 tcp:5205`), enabling the phone to talk to your computer's API seamlessly via `http://127.0.0.1:5205`.
- Compile the debug APK, install it to your phone, and launch the login screen.

---

## 6. How Mobile-to-Backend Networking Works (The Engineering Principle)

When running the mobile client on a physical device, why does `adb reverse` matter?

### The Problem
* The Android Emulator has a built-in virtual NAT router that routes `10.0.2.2` to the host machine.
* A **physical phone** does not have `10.0.2.2`. It has its own wireless/cellular IP. If you are on university or office Wi-Fi, the router often enables **Client Isolation**, blocking your phone from reaching your PC's IP address.

### The Mechanism (`adb reverse`)
```
[Android Phone App]
   │
   ▼ HTTP Request to http://127.0.0.1:5205
[Phone Local Loopback Socket]
   │
   ▼ Captured by ADB Daemon on Phone
[USB Data Cable]
   │
   ▼ Forwarded by ADB Server on PC
[PC Backend: http://localhost:5205]
```
With `adb reverse tcp:5205 tcp:5205`, the phone's loopback interface routes through the USB cable directly into your ASP.NET Core Web API. Zero configuration, zero Wi-Fi dependencies, zero firewall interference.

---

## 7. End-to-End Verification Scenarios

### Scenario A: Prosumer Registration & Activation
1. **Register on Phone**: In the mobile app, tap **Register**, enter a new NIC (e.g. `199512345678`) and password, and submit.
2. **Approve on Web**: Open the React Web Portal as `admin@smartsolar.lk`. Go to **Prosumers** → **Pending Activation** tab. Click **Activate Account**.
3. **Login on Phone**: The prosumer can now log into the mobile app and view active microgrid nodes.

### Scenario B: Operator QR Verification
1. **Generate QR**: Log into the mobile app as `kamal@solar.lk`. Open an existing reservation to view the unique transaction QR code.
2. **Scan QR**: Log in on a second device (or web portal) as `operator@smartsolar.lk` and scan the QR token to validate energy transfer.

---

## 8. Git Hooks & Team Workflow

To prevent broken code from being committed:
```powershell
git config core.hooksPath .githooks
```
The pre-commit hook automatically verifies that:
1. The .NET API compiles cleanly (`dotnet build backend/SmartSolar.Api`).
2. The React web app builds with zero TypeScript/lint errors (`npm --prefix web run build`).

Commits are blocked if either build fails.

---

## 9. Troubleshooting & FAQ

#### Q: `adb devices` shows `unauthorized`
- **Cause**: Your phone has not trusted your PC's RSA fingerprint.
- **Fix**: Re-plug the USB cable, unlock your phone, and tap **Allow** on the prompt.

#### Q: `Failed to bind to address http://localhost:5205: address already in use`
- **Fix**: Kill any hanging backend process in PowerShell:
  ```powershell
  Get-Process -Name "SmartSolar.Api" -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

#### Q: `Unsupported class file major version` during mobile build
- **Cause**: Using Java 22 or 27 instead of Java 17/21.
- **Fix**: Install OpenJDK 17 (`winget install EclipseAdoptium.Temurin.17.jdk`) and set `JAVA_HOME`.
