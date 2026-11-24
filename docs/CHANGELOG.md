# Nammooru Bus — Changelog

All notable releases and updates to Nammooru Bus are documented in this file.

---

## [v1.0.1] - 2026-11-23

### Release v1.0.1

- Screen insets fixed for punch-hole camera and status bar visibility
- Polished first-launch flow: Language selection, 3 walkthrough slides, Theme setup
- In-app update notifications for new releases
- Dedicated What's New changelog page

---

## [v1.0.0] - 2026-11-23

### Initial Production Release & Android App Launch (Phase 6 & 7)

#### Android App (Capacitor 8)
- **Store-Quality Android Experience**: Built with Capacitor 8, locked portrait mode, HTTPS-only network security, and display cutout handling (`windowLayoutInDisplayCutoutMode: shortEdges`).
- **Seamless Launch Animation**: Handover from native Android 12+ splash to a 2.2s React + Framer Motion animated brand launch with road ribbon, bus spring, and amber haptic pulse.
- **Onboarding Carousel & Quick Start**: 3-slide bilingual introductory walkthrough (`/welcome`) with "Let's Go" and guest exploration on Android.
- **Hardware Back Button Control**: Intelligently handles modal sheets, bottom drawers, and web history; features double-tap exit toast on the Explore screen and background minimization to preserve active driver GPS tracking.
- **Background & Foreground Geolocation**: Driver shifts automatically hold `KeepAwake` and broadcast live coordinates with foreground notification channels.
- **One-Tap Direct APK Distribution**: Production-signed release APK hosted directly on the landing page (`/downloads/nammooru-bus.apk`) with version badge, real file size, QR code scanner, and install guide.

#### Web App & Commuter Features
- **Live Bus Tracking & ETAs**: Real-time vehicle positions with live pulsing dot, ETA countdown, speed, and leave-now travel advice.
- **Bilingual Interface**: Full, verified English and Kannada (`ಕನ್ನಡ`) translations across all passenger, driver, and administrative screens.
- **3 Cohesive Themes**: Signature constant brand gradient with WCAG AAA-compliant Light (`#F2F6FF`), Dark (`#0A0B10`), and Blue (`#050B2E`) color schemes.
- **Passenger Utilities**: Smart multi-leg route finder, walking directions, fare calculator, SOS emergency WhatsApp location share, and saved offline trips.
- **Driver Console**: Dedicated shift dashboard (`/driver`), route selection, direction toggles, transit status updates (On Time, Delayed, Breakdown), crowd meters (Seats Free, Filling Up, Packed), and CSV shift logs.
- **Admin Control Panel**: Real-time live fleet monitor, stop and route editors, headway schedule manager, fare matrices, passenger complaint triage, system announcements, and immutable audit logs.
