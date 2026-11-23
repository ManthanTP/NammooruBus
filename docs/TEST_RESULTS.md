# Nammooru Bus — System Verification & QA Test Results

**Date**: 2026-11-23  
**Release**: v1.0.0 (Web + Android Capacitor)  
**Target Environment**: Chrome Mobile/Desktop, Android 12+ AVD, Physical Android Device  

---

## 1. Core QA & PRD Section 20 Test Matrix

| # | Test Case / Scenario | Expected Outcome | Result | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **TC-01** | Landing Page Load & Contrast | Constant brand gradient `#0040FF` to `#00136E`, white text, WCAG 4.5:1 | **PASS** | Axe color contrast 0 violations |
| **TC-02** | Direct APK Download from Landing | Button triggers `/downloads/nammooru-bus.apk` download, shows v1.0.0, 15.1 MB | **PASS** | Direct attachment headers in `vercel.json` |
| **TC-03** | Guest Commuter Flow | Tap "Continue as guest" $\rightarrow$ lands directly on `/explore` with cached stops | **PASS** | Zero registration required |
| **TC-04** | Stop Search & Swap | Selecting From/To stops and clicking Swap interchanges them with haptic tick | **PASS** | Synchronized state in `HomePage.jsx` |
| **TC-05** | Route Finding & Fares | Displays direct and 1-transfer routes with calculated stage fares (₹5 base) | **PASS** | Verified via `routeFinder.test.js` |
| **TC-06** | Real Road Polyline & Walking | Route displays road-snapped paths via OSRM; walking distance calculated | **PASS** | Verified via `roadRouting.test.js` |
| **TC-07** | Live Bus GPS & Leave-Now | Shows real-time bus marker on road path with speed and departure verdict | **PASS** | LiveStore handles reconnects |
| **TC-08** | SOS Emergency Sharing | Hold 1s triggers medium haptic and launches WhatsApp/native share sheet | **PASS** | Native fallback tested |
| **TC-09** | Passenger Registration & Login | Email/password sign-up creates profile with default role `'passenger'` | **PASS** | Auto-login & redirect to `/explore` |
| **TC-10** | Driver Registration with Key | Unlocks driver console via `claim_driver_role` RPC with transit key verification | **PASS** | Verified via `driverSignup.test.js` |
| **TC-11** | Driver Start Shift & Bus Assign | Inserts active trip with status `'active'` and crowd `'empty'`; no constraint errors | **PASS** | Check constraint `trips_crowd_level_check` compliant |
| **TC-12** | Driver Transit & Crowd Updates | Driver updates status (`delayed`/`breakdown`) and crowd (`moderate`/`full`) | **PASS** | Realtime broadcast to commuters |
| **TC-13** | Driver Profile in Driver Layout | Clicking Profile in driver footer stays on `/driver/profile` with driver banner | **PASS** | Preserves driver layout navigation |
| **TC-14** | Driver Shift Reports & CSV Export | Aggregates daily shift minutes; CSV downloads client-side with full headers | **PASS** | Handles zero-trips and populated logs |
| **TC-15** | Admin Refresh Persistence | Admin remains signed in after page reload without sudden redirects | **PASS** | AuthStore waits for `initialized: true` |
| **TC-16** | Single Admin Branding | Admin layout shows control panel branding in sidebar only on desktop | **PASS** | Deduplicated top bar header |
| **TC-17** | No Admin Links on Public Pages | Landing page, guest pages, and footer have no links to admin portal | **PASS** | Admin route hidden behind secret path |
| **TC-18** | Native Welcome Flow (Android) | Native launch shows 3-slide carousel (`/welcome`) $\rightarrow$ `/get-started` | **PASS** | Web defaults to `<LandingPage />` |
| **TC-19** | Hardware Back Button Hierarchy | Topmost sheet $\rightarrow$ router history $\rightarrow$ double-tap exit toast on `/explore` | **PASS** | 6/6 unit tests passing in `backHandler.test.js` |
| **TC-20** | Active Driver Trip Protection | Pressing back during an active driver trip minimizes app without killing GPS | **PASS** | Calls `App.minimizeApp()` via Capacitor |

---

## 2. Accessibility & Theme Audit Results

- **Theme Consistency**: Verified Light (`#F2F6FF`), Dark (`#0A0B10`), and Blue (`#050B2E`) themes across all passenger, driver, and admin routes.
  - Zero unstyled white boxes in dark mode (`DriverTripPage`, `DriverHistoryPage`, `DataTable`, `LocationBanner`).
  - Hero and primary brand cards maintain constant brand gradient (`--grad-brand`) with `--on-brand` (`#FFFFFF`) text across all themes.
- **Kannada (`ಕನ್ನಡ`) Review**:
  - Tested at 320px (iPhone SE 1st gen), 360px (standard Android), and 430px (iPhone 14 Pro Max / modern flagships).
  - Kannada complex glyphs and sub-ligatures render clearly without horizontal truncation or text overflow.
  - All 171 i18n keys aligned across `en.json`, `kn.json`, and application source code.
- **Touch Target Compliance**:
  - All actionable buttons, segmented tabs, and form elements meet minimum 44px $\times$ 44px tap targets.
  - Driver status and crowd buttons provide minimum 56px–64px oversized touch targets for safe in-vehicle operation.

---

## 3. Production Build & Bundle Summary

- **Web Distribution**:
  - Lazy-loaded driver and administrative routes.
  - Landing page code-split from core passenger runtime.
- **Android APK**:
  - Signed release APK: `public/downloads/nammooru-bus.apk` (15.1 MB).
  - Verified with Android SDK `apksigner` using APK Signature Scheme v2.
