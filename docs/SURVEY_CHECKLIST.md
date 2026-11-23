# Nammooru Bus — Transit Survey & Real Data Onboarding Checklist

This document details the standardized field procedure to replace the seed/demo data with real municipal transit survey data (e.g. NWKRTC / HDMC bus stops and routes) using the built-in Admin management tools.

---

## 1. Pre-Survey Preparation

1. **Hardware & Equipment**:
   - GPS-enabled mobile phone or handheld GPS logger (accuracy $\le$ 3–5 meters).
   - Nammooru Bus installed on phone (or web app opened on Chrome mobile).
   - Clipboard / spreadsheet app for recording stop names in English and Kannada (`ಕನ್ನಡ`).
2. **Authority Coordination**:
   - Obtain official schedule timetables and route codes from the regional transit division (e.g. NWKRTC CBT Hubballi / Dharwad depots).

---

## 2. Field Survey Process: Bus Stops

1. **Recording Coordinates**:
   - Stand directly at the passenger boarding flag / shelter.
   - Record latitude and longitude with 5 decimal places of precision (e.g. `15.35242, 75.13881`).
2. **Bilingual Naming**:
   - Record the standard English display name (e.g. `Chennamma Circle`).
   - Record the localized Kannada name with exact orthography (e.g. `ಚೆನ್ನಮ್ಮ ವೃತ್ತ`).
3. **Format as Stops CSV (`stops.csv`)**:
   ```csv
   code,name_en,name_kn,lat,lng,active
   ST001,Old Bus Stand,ಹಳೆಯ ಬಸ್ ನಿಲ್ದಾಣ,15.3524,75.1388,true
   ST002,Railway Station,ರೈಲ್ವೆ ನಿಲ್ದಾಣ,15.3617,75.1437,true
   ST003,Chennamma Circle,ಚೆನ್ನಮ್ಮ ವೃತ್ತ,15.3575,75.1383,true
   ```

---

## 3. Importing Stops into Nammooru Bus

1. Sign in to the Admin Portal at `/12345678/admin/login`.
2. Navigate to **CSV Import** (`/12345678/admin/import`).
3. Under **Import Stops**, choose `stops.csv` and click **Validate & Import**.
4. The system automatically creates new records and updates existing matching stops.
5. In **Stops Manager** (`/12345678/admin/stops`), verify stop markers on the interactive map. Use the **Snap to road** utility if a coordinate was captured slightly off the roadway.

---

## 4. Route Survey & Road Path Generation

1. **Define Route Metadata**:
   - Route Code (e.g. `201`, `45A`, `12`).
   - Route Name in English and Kannada (e.g. `CBT to Navanagar via Unkal`).
   - Brand Route Color (hex code e.g. `#0040FF`, `#12A150`, `#FFB400`).
   - Directionality (`two_way: true` or `false`).
2. **Order Route Stops in Route Editor**:
   - Go to **Routes** (`/12345678/admin/routes`) $\rightarrow$ Click **Edit Stops** or **Create Route**.
   - Add the surveyed stops in the exact driving sequence from Origin to Terminus.
3. **Generate Road Path**:
   - Click the **"Generate road path"** button.
   - The system queries the OSRM routing engine to fetch the true road polyline geometry along actual Hubballi-Dharwad street networks.
   - Distances (`dist_km`) and inter-stop travel durations (`min_from_prev`) are calculated and saved atomically.

---

## 5. Setting Schedules & Fares

1. **Schedules**:
   - Go to **Schedules** (`/12345678/admin/schedules`).
   - Enter First Bus time (e.g. `06:00`), Last Bus time (e.g. `22:30`), and Headway interval (e.g. `10` minutes) for Weekday and Weekend schedules.
2. **Fare Matrix**:
   - Go to **Fares** (`/12345678/admin/fares`).
   - Configure Base Stage Minimum Fare (e.g. ₹5 for the first 2.0 km) and Additional Stage Cost per stage.

---

## 6. Field Driver & Vehicle Assignment

1. **Fleet Registration**:
   - Go to **Fleet & Drivers** (`/12345678/admin/fleet`).
   - Add registered vehicle registration numbers (e.g. `KA-25-F-0321`).
2. **Driver Claim Key**:
   - Generate or supply the driver registration key configured in `driver_signup_config`.
   - The driver enters the key and claims their assigned vehicle on `/profile` or `/driver/bus`.
3. **Pilot Verification**:
   - Driver starts shift $\rightarrow$ Live positions broadcast to passenger app.
   - Commuters can track the live bus on `/live` with real road paths.
