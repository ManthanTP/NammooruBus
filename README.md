# Nammooru Bus (ನಮ್ಮೂರು ಬಸ್)
> **Our town. Our bus.**  
> VTU College Project (1BCS308) — Local Public Transportation Information and Route Assistance System

---

## 1. Quick Start

### Prerequisites
- Node.js 18+ (tested with Node 20+)
- npm 9+
- A free [Supabase](https://supabase.com) project

### Installation
```bash
# Clone and enter directory
git clone <repo-url>
cd NammooruBus

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

Fill in your Supabase credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_SECRET_KEY=nammooru-admin-secret-2026
```

---

## 2. Supabase Database Setup

1. Open your Supabase Project Dashboard and go to the **SQL Editor**.
2. Run `supabase/schema.sql` (or `schema.sql`) to create tables, functions, triggers, and Row Level Security (RLS) policies.
3. Run `supabase/seed.sql` to populate sample stops, routes, schedules, fares, and buses for Hubballi.
4. (Optional) Disable email confirmation under **Authentication > Providers > Email** ("Confirm email" toggle OFF) for instant local registration on the free plan.

### Creating the First Admin
1. Register a new user in the app at `/register` (e.g. `admin@nammooru.in`).
2. Run this query in the Supabase SQL editor:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@nammooru.in');
```
3. Navigate to `/12345678/admin/login` and log in using your email, password, and `VITE_ADMIN_SECRET_KEY`.

### Configuring & Rotating the Driver Registration Secret Key (Phase 5.5)
1. Run `supabase/driver_signup.sql` once in your Supabase SQL Editor to install the `claim_driver_role` RPC and security tables.
2. Insert or rotate your driver registration key directly in Supabase:
```sql
-- Set or rotate your active driver registration key:
INSERT INTO public.driver_signup_config (driver_key, is_active)
VALUES ('CHANGE-ME-driver-key', true);
```
3. To disable driver self-registration or rotate keys:
```sql
-- Deactivate all old keys:
UPDATE public.driver_signup_config SET is_active = false;
-- Insert new secret:
INSERT INTO public.driver_signup_config (driver_key, is_active)
VALUES ('your-new-secure-driver-key', true);
```
4. Drivers can now register using the "I am a driver" toggle at `/register`, or passengers can unlock driver status in their `/profile` page. Key verification runs strictly inside Postgres via `claim_driver_role(p_key)`. The key is never exposed to the frontend.

---

## 3. Running & Building the App

```bash
# Start development server
npm run dev

# Run production build
npm run build

# Preview production build
npm run preview
```

---

## 4. Verification Steps

1. **Dev Server & Routing**:
   - Run `npm run dev` and open `http://localhost:5173`.
   - The Home screen opens with live data badges and quick tiles.
2. **Auth & Role Redirects**:
   - Go to `/register` and sign up a passenger. It will log you in and redirect to `/`.
   - Go to `/login` with an admin account: it shows a warning to use the admin portal.
   - Go to `/12345678/admin/login` and log in with an admin account: redirects to `/12345678/admin/dashboard`.
3. **Data Caching**:
   - On initial load, stops and routes are fetched from Supabase and stored in `localStorage` (`nb_stops`, `nb_routes`, `nb_version`).
   - On refresh, data loads instantly from `localStorage` without re-fetching unless `meta.data_version` changes.
4. **Language Toggle**:
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

