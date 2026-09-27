# Smart Solar Microgrid Trading System

SE4040 — Enterprise Application Development · Year 4 Semester 2, 2026 · Assignment 1

An end-to-end client–server system for trading solar energy across a microgrid. All
business logic lives in a central C# Web API (FAT service pattern) backed by MongoDB;
the React web application and the pure native Android application are user interface
layers that talk to the service over REST only.

---

## Repository layout

| Folder | Contents |
| --- | --- |
| `backend/` | `SmartSolar.Api` — C# ASP.NET Core Web API (.NET 9), MongoDB, JWT auth, hosted on IIS |
| `web/` | React 18 + Vite + Material UI (MUI) back-office client (Backoffice & Grid Operator) |
| `mobile/` | Pure native Android app (Java, Material Components, SQLite, Google Maps, ZXing QR) |

---

## Architecture

```
  Android (Java + SQLite)  ──REST──┐
                                   ├──►  C# Web API on IIS  ──►  MongoDB
  React web app (Material UI) ─────┘        (all business logic)
```

Neither client touches MongoDB. The Android app keeps a local SQLite database only for
the signed-in session and a cached copy of the microgrid nodes.

---

## MongoDB collections

| Collection | Purpose |
| --- | --- |
| `Users` | Every account. Backoffice / Grid Operator get an ObjectId; prosumers use their **NIC as `_id`** |
| `SolarStationInfo` | Microgrid nodes — GPS position, capacity in kW/h, battery slot count |
| `EnergyBookingSlots` | Bookable time windows per node, with the live available-slot counter |
| `EnergyReservations` | Power trading bookings, their status and the transaction QR token |

## Business rules (all enforced in the API)

- A reservation must be scheduled **within 7 days** of today.
- Updating or cancelling a reservation needs **at least 12 hours notice**.
- A microgrid node **cannot be deactivated or deleted** while pending/approved reservations exist.
- A prosumer registers with their **NIC as the primary key** and stays inactive until a
  Backoffice officer activates the account. Only Backoffice can reactivate.
- Approving a reservation issues the QR token; the Grid Operator scan is verified
  server-side before the transfer is marked complete.

---

## Running the project

### 1. Web service (`backend/`)

Prerequisites: .NET 9 SDK, MongoDB running locally (or an Atlas connection string).

```bash
cd backend
dotnet restore
dotnet run --project SmartSolar.Api
```

Swagger UI: <http://localhost:5205/swagger>

Edit `backend/SmartSolar.Api/appsettings.json` to set your MongoDB connection string and
**replace the JWT `SecretKey` with your own long random value**.

On first start against an empty database a default account is seeded:

```
email:    admin@smartsolar.lk
password: Admin@123
```

#### Publishing to IIS

1. Install the **ASP.NET Core 9.0 Hosting Bundle** on the server.
2. `dotnet publish backend/SmartSolar.Api -c Release -o C:\inetpub\SmartSolarApi`
3. Create an IIS site pointing at that folder; set the application pool to **No Managed Code**.
4. `web.config` in the project already configures the ASP.NET Core Module (in-process).

### 2. Web application (`web/`)

```bash
cd web
cp .env.example .env     # point VITE_API_BASE_URL at the API
npm install
npm run dev              # http://localhost:5173
```

To pick a microgrid node's GPS position on a map instead of typing it, set
`VITE_GOOGLE_MAPS_API_KEY` in `web/.env` to a key with the **Maps JavaScript API** enabled
(restrict it to `http://localhost:5173/*` and your deployed web address). Without a key the
Nodes page falls back to manual latitude / longitude entry.

### 3. Android application (`mobile/`)

Quickest way, from PowerShell in the repository root:

```powershell
.\mobile\run-mobile.ps1
```

The script checks Java, the Android SDK, Gradle and a connected device, installs
anything missing, starts the Web API, then builds, installs and opens the app.

To do it by hand instead, open the `mobile/` folder in Android Studio (compileSdk 35, minSdk 26, Java 17).

1. Copy `local.properties.example` to `local.properties` and add your `sdk.dir` and
   `MAPS_API_KEY` (Google Maps Android API key).
   The Gradle wrapper JAR/scripts are not committed — Android Studio generates them on
   first open (or run `gradle wrapper` if you have Gradle installed).
2. The API base URL is `http://127.0.0.1:5205`. `run-mobile.ps1` runs
   `adb reverse tcp:5205 tcp:5205`, which forwards that port to the API on your PC for
   both a USB phone and an emulator. When running from Android Studio, run that command yourself.
3. Run the `app` configuration.

---

> 📖 **Developer Guide**: For complete step-by-step setup, account credentials, and testing procedures across all services, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

---

## Current status of the project

Working end to end:

- **Backend Web API**:
  - Full CRUD for users, stations, slots, and reservations enforcing all business rules (7-day window, 12-hour notice, station deactivation guard).
  - Multi-collection automated seed data (`Users`, `SolarStationInfo`, `EnergyBookingSlots`, `EnergyReservations`).
  - .NET User Secrets setup for database credential isolation.
  - IIS configuration via `web.config` for in-process hosting.
- **Web Application**:
  - JWT authentication with role-based routing (Backoffice vs. Grid Operator).
  - Operations Dashboard with live stat cards, recent trading activity, and station capacity.
  - Microgrid Node Management: node create, edit, delete, activate/deactivate.
  - Station Slot Management: schedule booking windows, live available bay counters, edit/delete slots.
  - Energy Slot Reservations: create booking, reschedule/update, approve, cancel, search filters, and QR inspection.
  - Prosumer Management: activate pending accounts, edit prosumer profiles, review deactivation requests.
  - Web User Management: create Backoffice and Grid Operator users.
- **Mobile Application**:
  - Login, registration by NIC (stored as primary key).
  - Prosumer profile edit and account deactivation request.
  - Booking create, change and cancel, with a summary page after each action.
  - Booking details with the transaction QR code once approved.
  - Booking list filtered by status and upcoming/history; operators can also search by NIC.
  - Prosumer and operator dashboards with pending and approved upcoming counts.
  - Google Maps node markers plotted from stored coordinates.
  - Operator QR scan: the booking is fetched from the server and shown, then verified and completed.
  - SQLite keeps the login (with its expiry) and a cached copy of the microgrid nodes.

Remaining tasks:
- Report deliverables: UI screenshots, high-level/use-case/DFD diagrams, references.

---

## Team

| Member | IT number | Contribution |
| --- | --- | --- |
| _TBD_ | _TBD_ | _TBD_ |
| _TBD_ | _TBD_ | _TBD_ |
| _TBD_ | _TBD_ | _TBD_ |
| _TBD_ | _TBD_ | _TBD_ |

**Git repository:** _add link_

**Demo video (max 5 minutes):** _add YouTube / OneDrive link_
