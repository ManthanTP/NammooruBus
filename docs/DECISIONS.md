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
*(To be recorded in Item 3)*

---

## 3. Item 5: Native-Only Integer Version Update Engine (Locked)
*(To be recorded in Item 5)*

---

## 4. Item 6: Build Versioning Single Source of Truth (Locked)
*(To be recorded in Item 6)*
