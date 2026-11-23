# Nammooru Bus (ನಮ್ಮೂರು ಬಸ್)
> **Our town. Our bus.**  
> VTU College Project (1BCS308) — Local Public Transportation Information and Route Assistance System  
> Built by **Manthan Patel**

---

## 1. Features

- **Live Real-Time Bus Tracking**: Sub-second bus positions transmitted via Supabase Realtime, with smooth heading rotation and live ETA counters.
- **Smart Multimodal Journey Planning**: Automatic route calculations with walking directions to nearest stops, transfers, and departure times.
- **Nearby Stops & Geolocation**: Instant discovery of nearest transit stops using GPS coordinates with walking distance and minutes.
- **Fare Calculator**: Automatic fare computation based on NWKRTC stage distance brackets (e.g. ₹5 base, ₹5 per 2 km stage).
- **Live Crowd Density Reporting**: Commuter and driver 3-level crowd reporting (Seats Free / Filling Up / Packed) with 5-minute per-user rate limiting.
- **Saved Trips & Offline Timetables**: Client-side IndexedDB/localStorage and PWA Service Worker caching for seamless offline schedule queries.
- **Full Bilingual Kannada & English**: Complete localized UI with Noto Sans Kannada font rendering at all standard viewport widths (320px, 360px, 430px+).
- **Three High-Contrast Themes**: Light, Dark (true black #0A0B10), and Blue (navy #050B2E) themes with 4.5:1 WCAG contrast compliance.
- **Native Android App (Capacitor)**: Edge-to-edge camera hole handling, custom animated splash, Android native back handler, and background GPS broadcasting.
- **Dedicated Driver Shell**: Driver bus claiming, live shift management, transit status broadcasts (On Time / Delayed / Breakdown), and shift log export.
- **Admin Control Panel**: Full management of stops, routes, timetables, fares, fleet, user roles, complaints, and audit logs. *(Accessible exclusively via the secret admin URL `/12345678/admin/login`)*.

---

## 2. Quick Start

### Prerequisites
- Node.js 18+ (tested with Node 20+ and Node 24)
- npm 9+
- A free [Supabase](https://supabase.com) project
- Android Studio Hedgehog+ and JDK 17 / 21 (for Android builds)

### Installation
```bash
# Clone and enter directory
git clone https://github.com/ManthanTP/NammooruBus.git
cd NammooruBus

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Variables (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here

# Raster Tile configuration (OpenStreetMap Humanitarian - 100% free)
VITE_TILE_URL=https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
VITE_TILE_ATTRIBUTION=&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors

# Default Geolocation (Hubballi-Dharwad)
VITE_DEFAULT_LAT=15.3647
VITE_DEFAULT_LNG=75.1240

# App URL and Secret Admin Key
VITE_APP_URL=https://nammoorubus.vercel.app/
VITE_ADMIN_SECRET_KEY=nammooru-admin-secret-2026
```

---

## 3. Database Setup Order

Run the SQL scripts in your Supabase SQL Editor in the following exact sequence:

1. `supabase/schema.sql`: Core schema (tables, constraints, RLS policies, audit logs, and functions).
2. `supabase/driver_signup.sql`: Driver key attempt tracking, secret configuration, and role promotion RPCs.
3. `supabase/driver_bus.sql`: Bus registration linking and driver reporting RPCs (`driver_report`).
4. `supabase/route_geometry.sql`: OSRM road snapped geometry column on routes (`geometry jsonb`).
5. `supabase/seed.sql`: Sample/demo data for Hubballi stops, routes, fares, and initial timetable. *(Note: sample data for demonstration; see `docs/SURVEY_CHECKLIST.md` for actual field survey procedures).*

### Creating the First Admin
1. Register an account in the web app at `/register` (e.g. `admin@nammooru.in`).
2. Run this query in the Supabase SQL editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@nammooru.in');
   ```
3. Navigate to `/12345678/admin/login` (admin panel link is kept private and never exposed on public pages) and log in using your email, password, and `VITE_ADMIN_SECRET_KEY`.

---

## 4. Running & Building the Web App

```bash
# Start development server
npm run dev

# Run production build (verifies APK exists in public/downloads/ and generates optimized chunks)
npm run build

# Preview production build locally
npm run preview

# Run automated test suites
npm run test

# Check i18n translation key consistency
npm run i18n:check

# Run theme contrast verification
npm run test:themes
```

---

## 5. Building the Android App (Capacitor)

### A. Debug APK
```bash
# 1. Generate adaptive icons and splash assets
npm run icons:android

# 2. Build web bundle and sync Capacitor native project
npm run build:android

# 3. Compile debug APK
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### B. Signed Release Production APK
1. Create `android/keystore.properties` (based on `android/keystore.properties.example`):
   ```properties
   storeFile=C:/path/to/nammooru-release-key.keystore
   storePassword=your_keystore_password
   keyAlias=nammooru
   keyPassword=your_key_password
   ```
2. Build and sign the production release APK:
   - On Windows (PowerShell):
     ```powershell
     .\scripts\release-apk.ps1
     ```
   - On Linux/macOS:
     ```bash
     chmod +x ./scripts/release-apk.sh
     ./scripts/release-apk.sh
     ```
   Or manually:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. The script automatically copies the signed APK to `public/downloads/nammooru-bus.apk` (15.1 MB) for direct one-tap download on the landing page (`/`).
4. Verify signature scheme:
   ```bash
   apksigner verify --verbose public/downloads/nammooru-bus.apk
   # Output: Verified using v2 scheme (APK Signature Scheme v2): true
   ```

### C. Publishing a New Release & In-App Update Notifications
When publishing a new version of Nammooru Bus:
1. **Build the APK**:
   ```powershell
   .\scripts\release-apk.ps1
   ```
2. **Verify APK placed in public downloads**:
   Ensure `public/downloads/nammooru-bus.apk` reflects the new build.
3. **Synchronize release notes and version numbers**:
   Run the sync script to update `version.json`, `releases.json`, `docs/CHANGELOG.md`, `android/app/build.gradle`, and `package.json`:
   ```bash
   npm run release:notes -- --version 1.0.1 --code 2 --notes-en "Punch-hole camera insets fixed|First-launch setup flow" --notes-kn "ಕ್ಯಾಮೆರಾ ಇನ್‌ಸೆಟ್‌ಗಳು ಸರಿಪಡಿಸಲಾಗಿದೆ|ಮೊದಲ ಪ್ರಾರಂಭದ ಹಂತಗಳು"
   ```
4. **Deploy to Vercel**:
   ```bash
   git commit -am "release: v1.0.1"
   git push origin main
   ```

> [!NOTE]
> Older APKs installed before Phase 6.1 do not have the in-app update checking engine; the "Update available" pop-up automatically functions for users on this version (v1.0.0+) and above.

---

## 6. Deployment to Vercel

The application is deployed on Vercel at [https://nammoorubus.vercel.app](https://nammoorubus.vercel.app).

`vercel.json` is configured with:
- Strict download headers for `.apk` files (`application/vnd.android.package-archive`, `attachment; filename="nammooru-bus.apk"`).
- SPA routing rewrites that explicitly exclude `/downloads/` so the APK file downloads directly without getting caught by `index.html`.
- Production caching policies for static assets.

To deploy your own instance:
```bash
npm install -g vercel
vercel --prod
```

---

## 7. Credits & License

- **Developer**: Manthan Patel
- **Institution**: VTU College Project (Course code: 1BCS308)
- **Map & Routing Data**: OpenStreetMap, OpenStreetMap Humanitarian (HOT), OSRM
- **Icons**: Lucide Icons
- **Fonts**: Outfit, Figtree, Noto Sans Kannada, DotGothic16
   - Click the sliding pill in the top bar to toggle between `EN` and `ಕನ್ನಡ`.
   - UI strings switch immediately and selection persists across refreshes (`nb_lang` in localStorage and `profiles.lang` for logged-in users).
5. **Admin Lockout**:
   - Enter invalid credentials 3 times on `/12345678/admin/login`.
   - The system locks out with a 60-second countdown timer.
6. **Production Build**:
   - Run `npm run build` to confirm zero errors and verified lazy-loaded bundles.

---

## 5. Building the Android App (Capacitor)

Nammooru Bus includes a complete, production-grade Android native project powered by **Capacitor 8**.

### Prerequisites
- **Node.js 18+** & npm 9+
- **Java Development Kit (JDK) 17** (e.g. Eclipse Temurin 17, Oracle JDK 17, or OpenJDK 17)
- **Android Studio** (Hedgehog 2023.1.1 or newer) with:
  - Android SDK Platform 34 / 35
  - Android SDK Build-Tools 34.0.0+
  - Android Virtual Device (AVD) running Android 12+ (API 31+) or physical device with USB debugging enabled

### Build Steps

1. **Generate Adaptive Icons & Notification Assets**:
   ```bash
   npm run icons:android
   ```
   *Generates foreground/background adaptive icons (with safe-zone margins), legacy icons, monochrome layers, and `ic_stat_nammooru` notification drawables across `mipmap-mdpi` to `xxxhdpi`.*

2. **Compile Web Bundle & Sync Native Android Project**:
   ```bash
   npm run build:android
   ```
   *Runs `npm run build` to create `dist/` and runs `npx cap sync android` to copy assets and register native Capacitor plugins.*

3. **Open Project in Android Studio**:
   ```bash
   npm run open:android
   ```
   *(Or open the `android/` directory directly in Android Studio).*

4. **Build APK**:
   - In Android Studio, go to menu: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - Or build directly via Gradle wrapper:
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
   - The compiled debug APK will be created at:
     ```
     android/app/build/outputs/apk/debug/app-debug.apk
     ```

### Testing on Device / Emulator

- **USB Debugging**: Connect your Android phone with Developer Mode & USB Debugging enabled, select your device in Android Studio, and click **Run 'app'** (`Shift + F10`).
- **Display Cutout / Camera Hole Emulation**:
  - In your AVD or device, open **Settings > System > Developer options > Display cutout**.
  - Choose **Punch Hole Cutout** or **Corner Cutout**.
  - Verify that the status bar renders seamlessly edge-to-edge and headers respect `--safe-top`.
- **Hardware Back Button Gestures**:
  - Tapping hardware back closes open sheets, modals, and drawers first.
  - On the Explore screen (`/explore`), pressing back displays a "Press back again to exit" toast, exiting on the second press within 2 seconds.
  - When a driver is actively broadcasting a live trip (`/driver/trip`), pressing back minimizes the app via `App.minimizeApp()` to keep GPS background tracking alive.

