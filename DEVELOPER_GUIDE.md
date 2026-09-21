# Developer Guide — Smart Solar Microgrid Trading System

This guide explains how to start, configure, and test all services in the repository.

---

## 1. Quick Reference & Port Cheat Sheet

| Service | Technology | Default URL / Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | MongoDB 7.0+ | `mongodb://localhost:27017` | Server-side NoSQL database (4 collections) |
| **Web API** | ASP.NET Core (.NET 9) | `http://localhost:5205` | FAT central business logic & REST API |
| **API Docs** | Swagger UI | `http://localhost:5205/swagger` | Interactive endpoint testing & OpenAPI spec |
| **Web Portal** | React 18 + Vite | `http://localhost:5173` | Backoffice & Grid Operator administration |
| **Mobile App**| Pure Native Android (Java)| Android Emulator / Device | Prosumer bookings, Google Maps, QR tokens |

---

## 2. Seeded Account Credentials

When the Web API starts against an empty database, the `DatabaseSeeder` automatically populates the following accounts:

| Role | Email / Identifier | Password | Status & Scope |
| :--- | :--- | :--- | :--- |
| **Backoffice** | `admin@smartsolar.lk` | `Admin@123` | Active. Full admin rights on Web portal. |
| **Grid Operator** | `operator@smartsolar.lk` | `Operator@123` | Active. Slot management on Web & QR scan on Mobile. |
| **Prosumer** | `kamal@solar.lk`<br>(NIC: `198512345678`) | `Prosumer@123` | Active. Android client user with approved booking. |
| **Prosumer** | `nimal@solar.lk`<br>(NIC: `199087654321`) | `Prosumer@123` | **Pending**. Awaiting Backoffice approval in Web portal. |

---

## 3. Starting the Services (Step-by-Step)

Follow this sequence when starting the system from scratch:

```
Step 1: MongoDB  ──►  Step 2: Web API  ──►  Step 3: Web App  ──►  Step 4: Mobile App
```

---

### Step 1: Database (MongoDB)

Ensure MongoDB is running locally before launching the backend API.

#### Option A: Docker (Recommended)
1. Launch **Docker Desktop**.
2. Run the MongoDB container:
   ```powershell
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```
   *(To restart the existing container in future sessions: `docker start mongodb`)*

#### Option B: Native Windows Service
If installed via MongoDB Community Server MSI, start the service:
```powershell
net start MongoDB
```

---

### Step 2: Central Web API (`backend/`)

#### Running in Development Mode
1. Open PowerShell and navigate to `backend/`:
   ```powershell
   cd backend
   dotnet restore
   dotnet run --project SmartSolar.Api
   ```
2. The service will output:
   ```
   Now listening on: http://localhost:5205
   Application started. Press Ctrl+C to shut down.
   ```
3. Verify in browser: <http://localhost:5205/swagger>

#### Configuration & Secret Isolation
- [appsettings.json](backend/SmartSolar.Api/appsettings.json) contains safe local defaults (`mongodb://localhost:27017`) and must **never** contain private passwords.
- If connecting to a cloud database (MongoDB Atlas), isolate credentials locally using .NET User Secrets:
  ```powershell
  dotnet user-secrets set "MongoDbSettings:ConnectionString" "mongodb+srv://user:pass@cluster.mongodb.net/..." --project SmartSolar.Api
  ```

#### Publishing to Windows IIS (Production)
1. Install **ASP.NET Core 9.0 Hosting Bundle** on Windows.
2. Publish release binaries:
   ```powershell
   dotnet publish backend/SmartSolar.Api -c Release -o C:\inetpub\SmartSolarApi
   ```
3. Open **IIS Manager** (`inetmgr`):
   - Add a new Website pointing to `C:\inetpub\SmartSolarApi`.
   - Set the Application Pool **.NET CLR Version** to **"No Managed Code"**.
   - [web.config](backend/SmartSolar.Api/web.config) handles in-process module binding automatically.

---

### Step 3: Web Portal Client (`web/`)

1. Open a new terminal in `web/`:
   ```powershell
   cd web
   npm install
   ```
2. Ensure `.env` exists (copy from `.env.example` if needed):
   ```env
   VITE_API_BASE_URL=http://localhost:5205
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
4. Open <http://localhost:5173> in your browser.
5. Log in as:
   - **Backoffice**: `admin@smartsolar.lk` / `Admin@123`
   - **Grid Operator**: `operator@smartsolar.lk` / `Operator@123`

---

### Step 4: Native Android Client (`mobile/`)

1. Open the `mobile/` directory in **Android Studio**.
2. Create `mobile/local.properties` (or copy from `local.properties.example`):
   ```properties
   sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
   MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   ```
3. **API URL on Android Emulator**:
   - The Android emulator accesses the host machine through `http://10.0.2.2:5205`.
   - This is pre-configured in `ApiClient.java`. If using a physical Android device on the same Wi-Fi, change `10.0.2.2` to your computer's local LAN IP (e.g., `192.168.1.50`).
4. Build and run on an Android Virtual Device (API level 26+).

---

## 4. End-to-End Testing Scenarios

### Scenario A: Prosumer Registration & Backoffice Approval
1. **Self-Registration**: On mobile (or via Swagger `POST /api/auth/register`), register with a new NIC (e.g., `199512345678`).
2. **Review on Web**: Log into the web portal as `admin@smartsolar.lk` and navigate to **Prosumers**.
3. Under the **Pending Activation** tab, find the new applicant and click **Activate Account**.
4. The prosumer can now log into the Android app.

### Scenario B: Node & Slot Management (Backoffice / Grid Operator)
1. Go to **Microgrid Nodes** (`/stations`).
2. Click **Edit** to update GPS coordinates or rated kW/h capacity.
3. Click **Slots** on any station to open the schedule drawer:
   - View scheduled windows and live available bay counters.
   - Click **Open New Booking Window** to create an available time slot.
   - Try reducing bays below active reservations to verify validation logic.

### Scenario C: Energy Trading Reservation (7-Day & 12-Hour Rules)
1. On the web app, go to **Reservations** (`/reservations`) and click **New Reservation**:
   - Enter active NIC: `198512345678`.
   - Select a station and an open slot (scheduled within 7 days).
   - Enter energy (kWh) and submit.
2. Click **Approve** on the pending booking:
   - The backend issues a unique transaction QR token.
   - Click the QR token button to preview the payload.
3. Test the **12-Hour Rule**:
   - Attempt to reschedule or cancel a booking scheduled less than 12 hours from now; the API will block the request and return a descriptive validation error.

---

## 5. Troubleshooting & FAQ

#### Q: `Failed to bind to address http://127.0.0.1:5205: address already in use`
- **Cause**: An existing instance of `SmartSolar.Api` or another application is holding port `5205`.
- **Fix**: Run in PowerShell:
  ```powershell
  Get-Process -Name "SmartSolar.Api" -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

#### Q: `System.TimeoutException: A timeout occurred after 30000ms selecting a server`
- **Cause**: MongoDB is not running or blocked on port `27017`.
- **Fix**: Check Docker container status (`docker ps`) or restart the service (`docker start mongodb`).

#### Q: `Command saslContinue failed: bad auth : authentication failed`
- **Cause**: Incorrect username or password in your MongoDB Atlas connection string.
- **Fix**: Verify database user in Atlas dashboard, or remove User Secrets override to use local MongoDB:
  ```powershell
  dotnet user-secrets remove "MongoDbSettings:ConnectionString" --project SmartSolar.Api
  ```

---

## 6. Git Hooks (Pre-Commit & Commit-Msg Enforcement)

This repository includes automated Git hooks in the `.githooks/` folder to ensure broken builds and messy commit messages never reach version control.

### Activating the Hooks (For all team members)
Run once after cloning:
```powershell
git config core.hooksPath .githooks
```

### What is enforced on every commit:
1. **Pre-Commit Hook (`.githooks/pre-commit`)**:
   - Compiles the C# backend (`dotnet build backend/SmartSolar.Api -t:Compile --nologo`).
   - Compiles the React web client (`npm --prefix web run build`).
   - **If either build fails**, the commit is immediately rejected and aborted.
2. **Commit-Msg Hook (`.githooks/commit-msg`)**:
   - Validates that the commit message adheres to **Conventional Commits**:
     `<type>(<scope>): <description>`
   - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - **If the format is invalid**, the commit is rejected with a helpful guide.

---

## 7. Automated AI Pull Request Summaries (GitHub Actions & Gemini)

The repository includes a GitHub Action in [.github/workflows/pr-ai-summary.yml](.github/workflows/pr-ai-summary.yml) that uses **Google Gemini** models to generate structured pull request summaries automatically upon PR creation.

### Supported Models (`GEMINI_MODELS`)
The summary script ([.github/scripts/generate_pr_summary.py](.github/scripts/generate_pr_summary.py)) supports the following models with automated fallback:
- `gemini-3.8-flash` *(Default)*
- `gemini-3.7-flash`
- `gemini-3.6-flash`
- `gemini-3.5-flash`
- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`
- `gemini-3.1-pro-preview`
- `gemini-3-flash-preview`

### Automated Model Fallback
If the preferred model encounters rate limits (HTTP 429), regional unavailability, or deprecation (HTTP 404), the script automatically cascades to the next supported model in the list without failing the CI run.

### How it operates:
1. When a PR is opened or reopened, the workflow checks out the repository and extracts a clean git diff (excluding lockfiles, binary assets, and build directories).
2. The diff is analyzed by Gemini via the REST API using [.github/scripts/generate_pr_summary.py](.github/scripts/generate_pr_summary.py).
3. The AI generates a structured markdown summary:
   - **Overview & Purpose**: High-level explanation of what changed and why.
   - **Key Changes by Component**: Grouped breakdown (e.g. Backend API, Web App, Documentation).
   - **Verification Checklist**: Targeted checklist for PR reviewers.
4. If the PR description is blank, the action populates it directly; if already filled out, it posts the AI analysis as a PR comment.

### Setting up the Gemini Secret (Repository Admins)
1. Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
2. In your GitHub repository, navigate to:
   **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Create a secret named **`GEMINI_API_KEY`** and paste your API key.
4. *(Optional)* Override the default model by adding a repository variable or environment variable named `GEMINI_MODEL`.
5. *Note: If the secret is not configured, the action gracefully leaves an informational reminder on the PR without failing the build pipeline.*




