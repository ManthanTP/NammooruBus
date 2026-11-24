# Nammooru Bus: Architectural & Design Decisions (Locked)

This document records the locked architecture and implementation decisions from Phase 8 (Stabilization). These decisions are permanent and must never be flipped or re-argued.

---

## 1. Item 2: Status Bar Architecture (Locked)

### Decision
A single, unified edge-to-edge status bar architecture is enforced across Android 8 through Android 15+ (targetSdkVersion 35/36):
1. **Native Window Layer (`MainActivity.java`)**:
   - `WindowCompat.setDecorFitsSystemWindows(window, false)` enables edge-to-edge drawing so app backgrounds flow seamlessly behind the system bar (Instagram style).
   - `window.setStatusBarColor(Color.TRANSPARENT)` and `window.setNavigationBarColor(Color.TRANSPARENT)` ensure zero system scrims or opaque bars.
   - `ViewCompat.setOnApplyWindowInsetsListener` measures the exact status bar and hardware cutout insets (`WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()`) and navigation bar insets, converting them to dp and dynamically injecting `--safe-top` and `--safe-bottom` into `document.documentElement.style`.
2. **Capacitor & Web Layer (`src/lib/platform.js`)**:
   - `setStatusBarTheme` only controls icon contrast via `StatusBar.setStyle({ style: Style.Light | Style.Dark })`.
   - Never calls `StatusBar.setOverlaysWebView` repeatedly, eliminating deprecated UI flag toggling and flicker.
   - Light theme (#FFFFFF header) uses `Style.Light` (dark icons).
   - Dark theme (#12141C header), Blue theme (#0B1450 header), and Brand screens (#0040FF Login/Register/Welcome) use `Style.Dark` (white icons).
   - Web always initializes `--safe-top: 0px` and `--safe-bottom: 0px`.
3. **No Double Padding Guarantee**:
   - Native code applies zero padding to WebView.
   - CSS handles insets via `paddingTop: var(--safe-top, 0px)` on top app headers and `bottom: var(--safe-bottom, 0px)` on bottom bars.
   - When the software keyboard (IME) opens, top status bar insets do not change; content does not jump.
   - Full-screen expanded map explicitly offsets close and locate controls with `paddingTop: max(12px, var(--safe-top, 0px))`.

### Verification Screenshots
Screenshots captured for cutout and no-cutout devices:
- `docs/screenshots/status_bar/android15_cutout_login.png`
- `docs/screenshots/status_bar/android15_cutout_home_light.png`
- `docs/screenshots/status_bar/android15_cutout_home_dark.png`
- `docs/screenshots/status_bar/android15_cutout_home_blue.png`
- `docs/screenshots/status_bar/android15_cutout_expanded_map.png`
- `docs/screenshots/status_bar/no_cutout_login.png`
- `docs/screenshots/status_bar/no_cutout_home_light.png`
- `docs/screenshots/status_bar/no_cutout_home_dark.png`
- `docs/screenshots/status_bar/no_cutout_home_blue.png`
- `docs/screenshots/status_bar/no_cutout_expanded_map.png`

---

## 2. Item 3: Map Tile Provider & Latency Fallback (Locked)

### Latency Measurement (From Hubballi z14-z16, 10 tiles):
- **OSM Standard (`tile.openstreetmap.org`)**:
  - Success Rate: 10/10 (100% 200 OK)
  - Median Latency: **19.5 ms**
  - Latency Range: 15 ms – 524 ms (Average: 70 ms)
- **OSM Humanitarian HOT (`tile.openstreetmap.fr/hot`)**:
  - Success Rate: 10/10 returned 404 HTML errors
  - Median Latency: **137 ms**
  - Latency Range: 134 ms – 794 ms (Average: 206 ms)
- **Outcome**: OSM Standard is **7.0x faster** with 100% valid tile delivery.

### Decision
1. **Default Provider**: OpenStreetMap Standard (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) configured in `src/lib/mapConfig.js` with proper attribution: `© OpenStreetMap contributors`.
2. **Automatic Silent Fallback**: Handled via `TileLayerWithFallback` in `MapView.jsx`. Listens for `tileerror` events; if 5 errors occur within any 10-second rolling window, it silently switches the tile provider to the next provider in the chain with zero alerts, toasts, or UI disruption to the user.
3. **Smooth Zoom & Memory**:
   - `keepBuffer`: set to `6` (reduced from 12 to prevent phone memory crashes and tile thrashing).
   - `updateWhenIdle`: `true`
   - `updateWhenZooming`: `false`
4. **Theme Filters**: Dark and Blue modes keep custom Leaflet tile pane CSS filters in `src/styles/index.css`.
5. **Locked**: Provider configuration is locked and must not be altered.

---

## 3. Item 5: Native-Only Integer Version Update Engine (Locked)

### Decisions & Architecture:
1. **Web Isolation**:
   - The web platform is always up to date by definition.
   - On the web, `checkAppUpdate()` immediately returns `{ hasUpdate: false, isWeb: true }`.
   - The update modal NEVER fires on web browsers.
   - On the Web Profile page, the "Check for updates" button is hidden and replaced by a clear badge: `"Website, always up to date"`.
2. **Pure Integer Comparison**:
   - Compares integer `versionCode` values, never string `versionName` (e.g. `1.0.10` vs `1.0.4` string comparisons previously failed).
   - An update is flagged ONLY if `installedVersionCode < latestVersionCode`.
   - If `installedVersionCode < minSupportedVersionCode`, the update is flagged as `isRequired: true`, which removes the "Remind me later" button and forces the passenger to update.
   - `versionName` is treated strictly as display-only text.
3. **Network & Cache Invalidation**:
   - `public/sw.js` explicitly skips `/version.json`, `/releases.json`, `/downloads/*`, and any `.apk` file, making them strictly network-only so the Service Worker never serves stale update manifests.
   - Native checks use `CapacitorHttp.get` (bypassing WebView cache and CORS) with an 8-second timeout, falling back to `fetch` with `cache: 'no-store'` and a `?t=Date.now()` timestamp query parameter.
4. **Non-Intrusive Execution**:
   - Checked automatically ONCE per app launch, 1.5 seconds after the first interactive screen renders.
   - Never checks repeatedly on tab switches or route changes.
5. **On-Device Diagnostics (`ProfilePage.jsx`)**:
   - In native mode, an expandable "Update diagnostics" group under About shows live values:
     - Installed: `versionCode <N> (v<name>)`
     - Remote: `latest <N>, min supported <N>`
     - Last check: `<timestamp>, status: <ok | failed | timeout | offline>`
     - Decision: `<up to date | optional update | required update>`
     - "Force re-check" button to bypass guards and refresh status instantly.

---

## 4. Item 6: Build Versioning Single Source of Truth (Locked)

### Decisions & Architecture:
1. **Single Source of Truth**:
   - `android/app/build.gradle` (`versionCode`, `versionName`) is the only primary source of truth for version numbers and codes across the entire project.
   - Version numbers must NEVER be manually updated in individual files in isolation.
2. **Synchronization Targets (5 Files)**:
   - `android/app/build.gradle` (Primary source: `versionCode`, `versionName`)
   - `package.json` (`version`)
   - `src/config/links.js` (`APK_VERSION`, `APK_BUILD`, `APK_SIZE`)
   - `public/version.json` (`latest.versionName`, `latest.versionCode`, `latest.apkSize`, `releaseNotes`)
   - `public/releases.json` (`[0].versionName`, `[0].versionCode`, `[0].apkSize`, `[0].notes`)
3. **Unified Release Pipeline (`scripts/release.mjs`, `npm run release`)**:
   - Automatically increments `versionCode` by 1 and sets the target `versionName`.
   - Atomically updates and synchronizes all 5 files in a single pass.
   - Enforces pre-flight quality gates: `npm run lint`, `npm run test` (including all unit tests and 78 route Playwright smoke tests), and `npm run build`.
   - Executes Android Gradle release build (`gradlew.bat assembleRelease` / `./gradlew assembleRelease`).
   - Cleans native web assets before build to prevent recursive nesting of prior `.apk` files.
   - Copies signed APK to `public/downloads/nammooru-bus.apk`.
   - Automatically computes exact SHA-256 and binary file size, recording them across metadata files.
4. **Automated Verification Gate (`scripts/verify_release.mjs`, `npm run verify:release`)**:
   - Validates that `versionName` and `versionCode` are 100% identical across all 5 files.
   - Exits with non-zero failure code if any discrepancy or drift is detected.
