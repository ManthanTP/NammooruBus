# Nammooru Bus — Product Requirements Document
 
**Version:** 1.0 | **Last Updated:** November 2026
**Developer:** Manthan Patel — CSE, Jain College of Engineering
**Course Project:** 1BCS308 — Local Public Transportation Information and Route Assistance System
**Platform:** Web (Vite + React) & Android (Capacitor)
**Backend:** Supabase (Auth, Database, Realtime) — free tier only
**Tagline:** Our town. Our bus.
**Short label (app icon):** Nammooru
 
---
 
## 1. What is Nammooru Bus?
 
- A free local bus companion app that tells passengers which bus to take, where to change, when it arrives and what it costs
- Passengers search From and To and get direct or 1-transfer options with time, fare and next bus
- Buses are tracked live on a map using the driver's phone GPS — no hardware, no paid tracking service
- Admins maintain stops, routes, timings and fares from a web panel — no code changes needed
- Works on web browsers and Android phones from one codebase
- Has three separate portals — Passenger, Driver, and Admin — each with its own layout and navigation
- Available in English and Kannada
- Runs entirely on free plans: Supabase free, Vercel free, Leaflet + OpenStreetMap, Capacitor
 
---
 
## 2. Problems It Solves
 
- Passengers do not know which local bus goes where, or where to change buses
- Printed or word-of-mouth timetables are wrong or out of date
- Google Maps has little or no live data for city buses in smaller cities
- Nobody knows how far the bus is, so people wait at stops with no idea of the ETA
- Crowd level, delays and breakdowns are never communicated to passengers
- Complaints and feedback have no tracked channel
- Transport staff cannot see which buses are running, late or silent
- Many passengers are more comfortable in Kannada than English
 
---
 
## 3. User Roles & Access
 
- **Passenger** — Guest or logged-in. Guests get route search, live map, nearby stops, routes, fares, alerts, offline timetables. Logged-in users also get saved trips, crowd reports, complaints, language sync
- **Driver** — Elevated access. Starts and ends trips, shares live GPS, marks On time / Delayed / Breakdown, sees trip history
- **Admin** — Root access. Manages stops, routes, schedules, fares, buses, drivers, users and roles, live monitor, complaints, alerts, reports, CSV import
 
Roles are stored in `profiles.role` (`passenger`, `driver`, `admin`). Every new account starts as `passenger`. Only an admin can promote a user to driver or admin.
 
---
 
## 4. Public Pages & Authentication
 
### Home (public)
- **Route:** `/`
- **Page:** `HomePage.jsx`
- Opens straight to the map-first home screen — no marketing page, no login wall
- Guests can use the whole passenger app except saved sync, crowd report and complaints
 
### Login
- **Route:** `/login`
- **Page:** `LoginPage.jsx`
- Email + password login (Supabase Auth)
- On success, fetches role from `profiles` and redirects:
  - Passenger → `/`
  - Driver → `/driver`
  - Admin → shown a message to use the admin login URL
- Links to `/register` and `/forgot-password`, plus "Continue as guest"
- Wrapped in `PublicRoute` — logged-in users are redirected away
 
### Register
- **Route:** `/register`
- **Page:** `RegisterPage.jsx`
- Name, email, password (8+ characters), preferred language
- Email confirmation is OFF in Supabase for the free plan (the built-in email sender is heavily rate limited)
- Profile row created automatically by a database trigger with role `passenger`
 
### Forgot Password / Reset Password
- **Route:** `/forgot-password`, `/reset-password`
- **Page:** `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`
- Optional if email sending is limited. If email is unavailable, admin can reset a user from the SQL editor
 
### Admin Login
- **Route:** `/12345678/admin/login`
- **Page:** `AdminLoginPage.jsx`
- Hidden admin login on an obfuscated URL segment (change `12345678` to your own value)
- Requires email + password + secondary access key (`VITE_ADMIN_SECRET_KEY`)
- 3 wrong attempts → 60 second lockout
- On success, redirects to `/12345678/admin/dashboard`
- The obscure URL is only a convenience. Real protection is the `role = 'admin'` check and Row Level Security on every table
 
---
 
## 5. Passenger Portal
 
All passenger pages sit inside `PassengerLayout.jsx`. The layout provides the full-screen map layer, a floating top bar (logo, live bus count, EN | ಕನ್ನಡ toggle), a draggable bottom sheet (snaps at 30%, 56%, 86% height) and a floating tab bar: **Explore, Live, Nearby, Routes, Saved**. Pages render inside the bottom sheet while the map reacts behind it.
 
### 5.1 Home
- **Route:** `/`
- **Page:** `HomePage.jsx`
- Heading "Where to?" and a search field that opens the search overlay
- Two tiles: **Live** (count of running buses, opens `/live`) and **Nearby** (stops within 1 km, opens `/nearby`)
- Dismissible alert banner showing the newest active admin alert
- "Arriving near you" horizontal cards: nearest stops with the next bus per route
- Recent searches (last 5, stored locally)
 
### 5.2 Search
- **Route:** `/search`
- **Page:** `SearchPage.jsx`
- Full-screen overlay sliding up from the bottom
- From and To fields, swap button (rotate animation), "Your location" option for From
- Type-ahead over cached stops, matches English and Kannada names, shows distance and route badges
- Validation: From and To must differ ("Pick two different stops")
- "Find buses" button runs the route finder and opens `/results`
 
### 5.3 Results
- **Route:** `/results?from=&to=`
- **Page:** `ResultsPage.jsx`
- Up to 8 options: direct and 1-transfer
- Ticket-style cards: route badge(s), total minutes, fare, next bus in N minutes, "Direct" or "1 change at <stop>", segment bar (walk / ride / change)
- Sort tabs with sliding highlight: Fastest, Fewer changes, Cheapest (instant, no refetch)
- States: loading skeleton, no result (suggest nearby stops), outside service hours ("No service now. First bus at HH:MM")
- Each search inserts one anonymous row in `search_log` (stop ids only)
 
### 5.4 Journey Details
- **Route:** `/journey`
- **Page:** `JourneyPage.jsx`
- Summary tiles: total minutes, fare, arrival time
- Vertical stepper: Walk to stop > Board route X (live ETA counter, crowd meter) > Get off at stop (n stops, m minutes) > Change to route Y > Destination with arrival time
- Map auto-fits the route line, shows A and B pins and a change pin, plus live buses of the routes used
- Actions: **Save** (toggle), **Share** (native share, else copy), **Track live** (opens Live filtered to the first route)
- SOS button visible here
 
### 5.5 Live Tracking
- **Route:** `/live`
- **Page:** `LivePage.jsx`
- Moving bus markers (route number, route colour), smooth movement between pings
- Route filter chips: All routes + each route
- Tap a bus: route name, next stop, ETA to next stop, progress bar from first to last stop, crowd meter, status (On time / Delayed / Breakdown)
- Stale rule: no ping for over 60 s = grey marker with "Last seen N min ago". Over 5 min = removed from the list
- Bus list under the detail card, sorted by ETA (also the screen-reader alternative to the map)
- **Report crowd** button (login required) and SOS button
 
### 5.6 Nearby Stops
- **Route:** `/nearby`
- **Page:** `NearbyPage.jsx`
- Needs location permission. Radius slider 300 m to 3 km (100 m steps). Map shows the user dot and radius circle
- Stop cards: name, distance, walking minutes (distance / 80 m per minute), routes passing with next bus minutes
- Tap a stop to start a search from it
- Permission denied state: explanation and manual stop selection
 
### 5.7 Routes Browser
- **Route:** `/routes` and `/routes/:id`
- **Page:** `RoutesPage.jsx`, `RouteDetailPage.jsx`
- All active routes: badge, name, frequency
- Expand a route: first and last bus (weekday / weekend toggle), ordered stop timeline with cumulative minutes, route drawn on the map
 
### 5.8 Stop Detail
- **Route:** `/stops/:id`
- **Page:** `StopDetailPage.jsx`
- Routes passing the stop with the next 3 arrivals each, stop location on the map
 
### 5.9 Saved
- **Route:** `/saved`
- **Page:** `SavedPage.jsx`
- Saved trips with route badges; tap to re-run the search; remove with exit animation
- Guests: stored locally. Logged in: synced to `saved_trips` and merged on login
- Language setting and login/logout live here too
 
### 5.10 Complaints
- **Route:** `/complaints`
- **Page:** `ComplaintsPage.jsx`
- Login required
- Form: route (optional), category (Delay, Behaviour, Cleanliness, Safety, Other), rating 1-5, message (5-1000 characters)
- "My complaints" list with status badge (Open, In progress, Resolved) and admin reply
 
### 5.11 Alerts
- **Route:** `/alerts`
- **Page:** `AlertsPage.jsx`
- Active alerts from admin: type icon (diversion, delay, cancel, info), title, body, affected routes, time
- New alerts arrive live via Supabase Realtime while the app is open (no push notifications in v1)
 
### 5.12 SOS Share
- Component: `SosButton.jsx` (used on Journey and Live)
- Press and hold 1 second (progress ring) to open the share sheet
- Message: "I am on bus <route> (<bus number>). Track me: <app url>/live?trip=<id>"
- Sent through the native share sheet or a `wa.me` link. No location is stored anywhere
 
### 5.13 Profile & Help
- **Route:** `/profile`, `/help`
- **Page:** `ProfilePage.jsx`, `HelpPage.jsx`
- Edit name and language; FAQ and how-to; link to complaint form
 
---
 
## 6. Driver Portal
 
All driver pages use `DriverLayout.jsx` — dark theme, large touch targets (minimum 64 px), very few controls. Routes are protected by `DriverRoute`.
 
### 6.1 Start Trip
- **Route:** `/driver`
- **Page:** `DriverStartPage.jsx`
- Select route (default from the driver's assigned bus), bus, direction (first stop to last stop, or reverse)
- Big green START button creates a `trips` row and starts GPS sharing
- A driver can have only one non-ended trip: offers "Resume" or "End" if one exists
- Safety line: "Do not use the phone while driving"
 
### 6.2 Active Trip
- **Route:** `/driver/trip`
- **Page:** `DriverTripPage.jsx`
- Header: route badge and pulsing "Sharing location" dot
- Cards: Current stop, Next stop with distance remaining, trip timer
- Buttons: **On time**, **Delayed**, **Breakdown**, **End trip** (confirm dialog)
- GPS ping every 5 seconds (10 seconds on low battery). Connection lost: keeps the latest position, shows "Reconnecting", never queues history
- Screen stays awake (Wake Lock API on web, KeepAwake plugin on Android) with a foreground service notification "Sharing bus location"
 
### 6.3 Trip History
- **Route:** `/driver/history`
- **Page:** `DriverHistoryPage.jsx`
- Last 20 trips: route, date, duration
 
---
 
## 7. Admin Portal
 
Uses `AdminLayout.jsx` for the sidebar, top bar (search, admin name, logout) and a "System Live" indicator. All routes sit behind `/12345678/admin/` and are protected by `AdminRoute`. Redirect: `/12345678/admin` → `/12345678/admin/dashboard`. Desktop-first.
 
### 7.1 Dashboard
- **Route:** `/12345678/admin/dashboard`
- **Page:** `AdminDashboard.jsx`
- Stat cards: routes, stops, buses, active trips, open complaints
- Bar chart: top routes by searches (last 7 days). Donut: complaints by category. Recent complaints table
 
### 7.2 Stops
- **Route:** `/12345678/admin/stops`
- **Page:** `AdminStopsPage.jsx`
- Table with search, sort, pagination
- Add / edit modal: English name, Kannada name, latitude, longitude, active
- Map picker: click the map to set the location, drag the marker to adjust
- Delete blocked if the stop is used by any route (shows which routes)
 
### 7.3 Routes
- **Route:** `/12345678/admin/routes` and `/12345678/admin/routes/:id`
- **Page:** `AdminRoutesPage.jsx`, `AdminRouteEditorPage.jsx`
- Form: code, English name, Kannada name, colour, two-way toggle, active
- Stop list editor: add stop, drag to reorder, distance (km) and minutes from the previous stop. Distance auto-suggested as straight-line x 1.3
- Live preview of the route line on the map
- Validation: at least 2 stops, no duplicate stop, first stop distance 0
 
### 7.4 Schedules
- **Route:** `/12345678/admin/schedules`
- **Page:** `AdminSchedulesPage.jsx`
- Per route and day type (weekday / weekend): first bus, last bus, frequency in minutes
 
### 7.5 Fares
- **Route:** `/12345678/admin/fares`
- **Page:** `AdminFaresPage.jsx`
- One config row: minimum fare, fare per stage, stage length in km
 
### 7.6 Fleet (Buses & Drivers)
- **Route:** `/12345678/admin/fleet`
- **Page:** `AdminFleetPage.jsx`
- Bus registry (registration number, route, active)
- Driver list; assign a driver to a bus
 
### 7.7 Users & Roles
- **Route:** `/12345678/admin/users`
- **Page:** `AdminUsersPage.jsx`
- Search users, promote or demote (passenger, driver, admin)
- Promoting to driver also creates the `drivers` row
 
### 7.8 Live Monitor
- **Route:** `/12345678/admin/live`
- **Page:** `AdminLiveMonitorPage.jsx`
- Map of all active trips with a side list
- Flags: Delayed (amber), Breakdown (red), Silent over 60 s (grey)
- Admin can force-end a trip
 
### 7.9 Complaints
- **Route:** `/12345678/admin/complaints`
- **Page:** `AdminComplaintsPage.jsx`
- Filters by status, category, route; drawer with details, reply box and status dropdown
 
### 7.10 Alerts
- **Route:** `/12345678/admin/alerts`
- **Page:** `AdminAlertsPage.jsx`
- Create (title, body, type, routes, start, expiry), expire now, delete. Appears live on passenger screens
 
### 7.11 Reports
- **Route:** `/12345678/admin/reports`
- **Page:** `AdminReportsPage.jsx`
- Route usage (from searches), delay counts by route, complaint resolution time, crowd patterns by hour. Export to CSV
 
### 7.12 CSV Import
- **Route:** `/12345678/admin/import`
- **Page:** `AdminImportPage.jsx`
- Upload stops, routes, route stops and schedules CSV files with a validation preview. Bad rows are highlighted and skipped; valid rows import
- Formats:
  - `stops.csv`: name_en, name_kn, lat, lng
  - `routes.csv`: code, name_en, name_kn, color, two_way
  - `route_stops.csv`: route_code, seq, stop_name_en, dist_km, min_from_prev
  - `schedules.csv`: route_code, day_type, first_bus, last_bus, headway_min
 
### 7.13 Audit Log
- **Route:** `/12345678/admin/audit`
- **Page:** `AdminAuditPage.jsx`
- Who changed which stop, route, fare or role, and when (written by database triggers)
 
### 7.14 Dev Simulator
- **Route:** `/12345678/admin/simulator` (only when `VITE_DEV_TOOLS=true`)
- **Page:** `AdminSimulatorPage.jsx`
- Pick a route and direction; app creates a trip and upserts a position every 2 seconds along the stops at a chosen speed, with Delay and Stop buttons
- For viva demos when real GPS is not possible. State clearly in the report that simulated data is for demonstration only
 
---
 
## 8. Core Logic
 
### 8.1 Route Finder (client-side, `lib/routeFinder.js`)
- All master data (stops, routes, route stops, schedules, fares) is fetched once and cached, so search is pure JavaScript and works offline
- Every route is an ordered list of stops. Forward = ascending sequence. Reverse is allowed when `two_way = true`, using the same distances and minutes
- **Direct:** From and To on the same route, in a valid direction
- **One transfer:** for each route containing From, for each later stop T on it, for each other route containing T and To in a valid direction
- Deduplicate by route + stops. Cap at 8 results
- Time = walk to first stop (3 min, or real distance / 80 m per minute) + wait + ride + (6 min change buffer + second ride)
- Ranking: fastest (time), fewer changes (transfers then time), cheapest (fare then time)
- Upgrade path if time permits: Dijkstra over a stop graph with transfer penalty
 
### 8.2 Live ETA (`lib/geo.js`, `lib/eta.js`)
- Project the bus position onto the route line to get "kilometres along the route"
- Remaining distance to a stop = stop position minus bus position, in the bus direction. If negative, the bus has already passed
- Speed = moving average of the last ~5 minutes of reported speed, clamped to 8-30 km/h, default 17 km/h
- ETA minutes = remaining km / speed x 60, plus 0.5 minute per remaining stop, minimum 1
- Recomputed on every position update; digits roll like a counter
 
### 8.3 Timetable Fallback (`lib/schedule.js`)
- Day type from today's weekday (Mon-Fri weekday, Sat-Sun weekend)
- Before first bus or after last bus: "No service now. First bus at HH:MM"
- Otherwise next departure = first bus + (number of headways elapsed + 1) x headway, plus cumulative minutes to the stop
- Live values are labelled "live", timetable values "scheduled"
 
### 8.4 Fare (`lib/fare.js`)
- Per leg: `max(min_fare, ceil(distance_km / stage_km) x per_stage)`
- Journey fare is the sum of leg fares, shown as "Rs N"
 
### 8.5 Stale & Status Rules
- Position age <= 60 s: live. 60-300 s: stale (grey, "last seen"). Over 300 s: hidden from passengers, shown as silent to admin
- Trip status Delayed or Breakdown shows a warning chip on Live and Journey for that route
 
### 8.6 Crowd
- Latest valid report wins and is stored on the trip. No report = no crowd meter (never shown as "empty")
- One report per user per trip per 5 minutes, enforced by the database function `report_crowd`
- Crowd meter shows 3 bars plus a text label (Seats free / Filling up / Packed) — never colour alone
 
---
 
## 9. Real-Time System & Live Tracking Flow
 
- Uses Supabase Realtime (`postgres_changes`) on `bus_positions`, `trips` and `alerts`
- **Driver:** starts trip > inserts `trips` row > watches GPS > upserts one `bus_positions` row per trip every 5 seconds > on End trip the row is deleted by a database trigger
- **Passenger:** loads active trips with positions once, then subscribes to changes on Live and Journey screens only; unsubscribes on leave
- Only one position row per active trip, no GPS history, to protect free-tier storage and writes
- If realtime disconnects: "Reconnecting" chip and polling every 10 seconds
- Alerts are pushed live to open apps (no FCM push in v1)
- Channels are created once per screen and removed on logout, with Zustand stores reset (same pattern as InstitutePLUSE)
- Load estimate for a demo: 5 drivers x 12 writes per minute. Keep demos short and make the ping interval a config constant (5-10 s)
 
---
 
## 10. Offline & Data Caching
 
- After the first successful load, master data is cached with a version number
- Web: localStorage + service worker (vite-plugin-pwa). Android: Capacitor Preferences
- `meta.data_version` is bumped by database triggers on every master data change. On app start (online), the app compares versions and refetches only when different
- Offline banner: "Offline. Showing saved timetable." Live map and writes are disabled with clear messages; search, routes, stops, saved and timetables keep working
- Cache keys: `nb_stops`, `nb_routes`, `nb_route_stops`, `nb_schedules`, `nb_fare`, `nb_version`, `nb_saved`, `nb_lang`, `nb_recent`
 
---
 
## 11. Language (English / Kannada)
 
- Toggle in the top bar and Profile; saved locally and in `profiles.lang`
- i18next with `en.json` and `kn.json`; no hard-coded UI strings
- Stop and route names come from `name_en` / `name_kn`; if Kannada is missing, falls back to English
- Fonts always include Noto Sans Kannada; layouts allow 30% longer labels
- Every screen must be checked in Kannada for clipping
 
---
 
## 12. Design System
 
- **Light, map-first premium theme.** The map is always visible behind a draggable bottom sheet
- **Colours:** ink `#0E1433`, cobalt `#3451F2` (primary), cobalt tint `#E6EAFF`, page `#F1F4FA`, surface `#FFFFFF`, line `#E1E6F2`, secondary text `#6B7494`, success `#12A676`, warning `#F59E0B`, danger `#E5484D`, LED amber `#FFC24A` on `#0A0F24`
- **Route colours:** set per route by admin (default palette: cobalt, coral `#F0643C`, green `#12A676`, violet `#8B5CF6`)
- **Typography:** Bricolage Grotesque (headings), Figtree (body), DotGothic16 (route number badges), Noto Sans Kannada (fallback in every stack)
- **Signature elements:** dot-matrix route badges (like a bus destination board), ticket-style result cards with a dashed stub, segment bar (walk / ride / change), 3-bar crowd meter with text
- **Shape:** cards radius 22, sheet radius 30, inputs 16, pills fully rounded. One soft shadow
- **Animations (Framer Motion):** sheet spring snap, 180 ms screen cross-fade, staggered result cards, sliding pills (tab bar, sort, language), rolling ETA digits, route line that draws itself, pulse ring on the selected bus, SOS hold ring, toasts from the top. Respects `prefers-reduced-motion`
- **Driver theme:** dark, large buttons, minimal text
- **Admin theme:** light, desktop-first, fixed sidebar, data tables with sort / search / pagination, confirm-delete dialogs, toasts
- **Required states on every data screen:** loading skeleton, empty, error with retry, offline, location denied, stale bus
- **Accessibility:** contrast 4.5:1, labels on icon buttons, visible focus, 44 px minimum tap target, no colour-only status
- **Copy style:** sentence case, active voice, no "please", no raw error strings
 
---
 
## 13. Tech Stack
 
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand 5 (state), React Router 7, Framer Motion 12, Recharts 2.15 (admin only, lazy loaded), Lucide React, i18next + react-i18next. JSX only — no TypeScript
- **Maps:** Leaflet 1.9 + react-leaflet 5 (React 19), OpenStreetMap-based raster tiles (CARTO Voyager for the demo). Tile URL and attribution in env variables. "© OpenStreetMap contributors" always visible
- **Backend:** Supabase (`@supabase/supabase-js` 2.x) — PostgreSQL, email auth, Realtime WebSockets, Row Level Security, RPC functions
- **Mobile:** Capacitor (same major version as InstitutePLUSE) — `@capacitor/geolocation`, `@capacitor/preferences`, `@capacitor/network`, `@capacitor/share`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor-community/keep-awake`, `@capacitor-community/background-geolocation` (driver mode; verify it supports your Capacitor version, else fall back to `watchPosition` with keep-awake)
- **PWA (web only):** `vite-plugin-pwa`
- **Exports:** CSV for reports (plain JavaScript)
- **Hosting:** Vercel free
- **Not used:** Google Maps, paid tile providers, SMS OTP, paid push services, Nominatim for in-app search, any paid API
 
---
 
## 14. Database Tables (Supabase)
 
- `profiles` — id (= auth user id), role, full_name, lang
- `stops` — name_en, name_kn, lat, lng, active
- `routes` — code, name_en, name_kn, color, two_way, active
- `route_stops` — route_id, stop_id, seq, dist_km, min_from_prev (unique per route + seq and per route + stop)
- `schedules` — route_id, day_type (weekday / weekend), first_bus, last_bus, headway_min
- `fare_config` — single row: min_fare, per_stage, stage_km
- `buses` — reg_no, route_id, active
- `drivers` — profile_id, bus_id, phone
- `trips` — bus_id, driver_id, route_id, direction, status (active / delayed / breakdown / ended), crowd_level, started_at, ended_at
- `bus_positions` — trip_id (primary key), lat, lng, speed_kmh, heading, updated_at (one row per active trip, upserted)
- `crowd_reports` — trip_id, user_id, level, created_at (insert only through `report_crowd()`)
- `complaints` — user_id, route_id, category, rating, message, status, admin_reply, created_at, updated_at
- `alerts` — title, body, type, route_ids, starts_at, expires_at, created_by
- `saved_trips` — user_id, from_stop, to_stop, route_key
- `search_log` — from_stop, to_stop, created_at (anonymous)
- `meta` — key, value (holds `data_version`)
- `audit_logs` — actor_id, action, entity, entity_id, created_at
- All tables have Row Level Security (RLS) enabled
 
**Database functions and triggers:**
- `is_admin()` and `my_role()` — security-definer helpers used by policies
- `handle_new_user()` — creates the profile on signup
- `report_crowd(trip, level)` — validates, rate limits, stores report, updates trip crowd level
- `bump_data_version()` — increments `meta.data_version` on master data changes
- Trip-end trigger — deletes the `bus_positions` row and clears crowd level when a trip ends
- `nearby_stops(lat, lng, radius)` — optional; the app also computes this locally from cached stops
 
---
 
## 15. Security & Privacy
 
- **Public read:** stops, routes, route stops, schedules, fares, buses, active alerts, active trips, bus positions
- **Admin write only:** all master data
- **Own data only:** saved trips, complaints (read own), profile (role field locked)
- **Driver:** can write `bus_positions` only for their own non-ended trip
- Users cannot change their own role (policy check against `my_role()`)
- Only the Supabase anon key is in the client. The service-role key is never used in the app
- Admin hidden URL + secret key + lockout are extra layers; Row Level Security is the real protection
- Passenger location is processed on the device only and never stored
- Driver location exists only while a trip is active and is deleted when it ends
- Complaints are visible only to the author and admins
- No analytics SDKs, no advertising IDs
- Input validated on the client and with database check constraints
 
---
 
## 16. Mobile (Android)
 
- Build pipeline: `Vite Build → Capacitor Sync → Android Studio / Gradle → NammooruBus.apk`
- App id: `com.nammooru.bus`, app name: `Nammooru Bus`
- Permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `WAKE_LOCK`, `POST_NOTIFICATIONS`
- Passenger: foreground location only, with a short explanation before the permission prompt
- Driver: background tracking with a persistent notification "Sharing bus location"; KeepAwake during the trip; everything stops on End trip
- Hardware back button: close overlay or sheet, then go back, then confirm exit on Home
- Status bar and safe-area insets handled
- Offline banner driven by `@capacitor/network`
- Share through `@capacitor/share`
- Test on Android 10, 12 and 14. Ask drivers to set battery to Unrestricted for reliable tracking
- If map tiles fail inside the APK, change `VITE_TILE_URL` to another free tile source and re-sync
- Distribute the debug or self-signed release APK directly (Play Store has a paid developer fee)
 
---
 
## 17. Free-Tier Rules & Limits
 
- Supabase free projects pause after about a week of inactivity — open the dashboard before any demo or review
- Free database is about 500 MB with limited realtime connections and messages — design for low write volume (already done: one row per trip, no history)
- No automatic backups on the free plan — keep `schema.sql`, `rls.sql`, `seed.sql` and CSV exports in the repo
- The public OpenStreetMap tile server is for light use only — keep the tile URL in one env variable
- Verify current limits on each provider's pricing page before final submission; free tiers change
- Environment variables (`.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TILE_URL`, `VITE_TILE_ATTRIBUTION`, `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LNG`, `VITE_APP_URL`, `VITE_ADMIN_SECRET_KEY`, `VITE_DEV_TOOLS`
 
---
 
## 18. Demo Data & Seed Plan
 
- Choose one city (Hubballi-Dharwad or your own) and survey 6-8 routes with 2-3 shared interchange stops (needed to demonstrate transfers)
- 25-40 stops with English and Kannada names and approximate coordinates
- For each route: ordered stops, minutes and kilometres between stops, first and last bus, frequency
- 4 buses, 3 driver accounts, 2 sample alerts, 3 sample complaints
- Enter data through the admin CSV import
- State in the report that data was collected by survey, with photos as evidence
 
---
 
## 19. Build Phases
 
1. **Foundation:** Vite + Tailwind + router + design tokens, Supabase schema + security policies + seed data, auth, i18n, data store with cache
2. **Passenger core:** map layer, bottom sheet, search, route finder, results, journey, routes browser, nearby, saved, fares, offline banner
3. **Live tracking:** driver app, position upsert, realtime store, live map, ETA, stale logic, crowd report, simulator
4. **Admin:** layout, stops with map picker, routes editor with drag reorder, schedules, fares, fleet, users, live monitor, CSV import, dashboard
5. **Extras:** complaints, alerts, SOS, reports, audit log
6. **Android:** Capacitor wrap, permissions, driver background tracking, APK, real device tests
7. **Polish:** animations, empty and error states, Kannada review, performance, test run, screenshots, report
 
If time is short, cut in this order: reports, audit log, alerts manager, SOS, complaints, CSV import. Never cut: search, journey, live map, driver tracking, admin stops and routes, Kannada, APK.
 
---
 
## 20. Test Cases
 
- Search between two seeded stops on one route returns the direct option with correct time and fare
- Search between stops needing a change returns a 1-transfer option showing the change stop
- Same From and To shows "Pick two different stops"
- Reverse search works on a two-way route and returns nothing on a one-way route
- Sort by Cheapest reorders results without reload
- Nearby with location on lists stops within the radius, sorted by distance; with location denied shows manual selection
- Driver starts a trip, `bus_positions` updates every 5 seconds; passenger sees the bus move within 10 seconds
- Driver ends trip: marker disappears within 10 seconds and the position row is deleted
- Kill the driver app: marker turns grey after 60 seconds
- Two crowd reports from one user within 5 minutes: second is blocked with a message; logged-out user is asked to log in
- Complaint submitted shows as Open; admin sets Resolved with a reply; the user sees it
- Admin adds a stop and a route; passenger refresh finds them in search
- Admin deletes a stop used by a route: blocked with the route names
- CSV import with a bad row: preview flags it, valid rows import
- Alert created: banner appears live on an open passenger app; after expiry it disappears
- Language toggle switches all UI text and stop names and persists after restart
- Offline: search, routes, saved work; Live is disabled with a message; offline banner is visible
- Passenger opening an admin URL is redirected; a passenger trying to write to `stops` through the API is denied; a user trying to set their own role to admin is denied
- SOS hold for 1 second opens the share sheet; the link opens Live on that trip
- APK on a real phone: install, location prompt, driver trip keeps updating with the screen off for 5 minutes
- 320 px width: no horizontal scroll and no clipped Kannada text
 
---
 
## 21. Out of Scope (v1)
 
- Payments, passes and ticketing
- Push notifications (FCM)
- iOS app
- Road-snapped routing and multi-transfer routing
- Machine-learning ETA and crowd prediction
- Offline map tiles
- Multi-city support
 
---
 
## 22. AI Context Injection Prompt
 
Copy and paste the block below into any AI model to give it a complete understanding of this project:
 
```text
I am working on "Nammooru Bus" (tagline: Our town. Our bus.), a free local public
transportation information and route assistance system for a college project
(1BCS308), built with React + Vite (JSX only, no TypeScript), Tailwind CSS,
Zustand, Framer Motion, Leaflet + OpenStreetMap, Supabase (Postgres, Auth,
Realtime, Row Level Security) and Capacitor for an Android APK. Everything must
run on free plans only.
 
CORE IDEA:
1. Passengers search From and To and get direct or 1-transfer bus options with
   time, fare and next bus. Search runs client-side on cached data, so it works
   offline.
2. Drivers share live GPS from their phone. The app upserts ONE row per active trip
   into bus_positions every 5 seconds (no history). Passengers see buses move on a
   Leaflet map through Supabase Realtime, with live ETA and crowd level.
3. Admins manage stops, routes (ordered stops with km and minutes), schedules,
   fares, buses, drivers, users and roles, alerts, complaints and reports.
4. Languages: English and Kannada (i18next, name_en / name_kn from the database).
 
ROLES: passenger (guest or logged in), driver, admin. Roles live in profiles.role.
Admin pages are under /12345678/admin/* with a hidden login. Real protection is
Row Level Security on every table.
 
PASSENGER ROUTES: / (home), /search, /results, /journey, /live, /nearby, /routes,
/routes/:id, /stops/:id, /saved, /login, /register, /complaints, /alerts,
/profile, /help.
DRIVER ROUTES: /driver (start trip), /driver/trip, /driver/history.
ADMIN ROUTES: dashboard, stops, routes, routes/:id, schedules, fares, fleet,
users, live, complaints, alerts, reports, import, audit, simulator.
 
TABLES: profiles, stops, routes, route_stops, schedules, fare_config, buses, drivers,
trips, bus_positions, crowd_reports, complaints, alerts, saved_trips, search_log,
meta (data_version), audit_logs.
 
KEY LOGIC: route finder (direct + one transfer, 6 min change buffer), live ETA
(distance along route / moving-average speed clamped 8-30 km/h), timetable fallback
from first bus + headway, stage-based fare, stale bus rule (60 s grey, 300 s hidden),
crowd report rate limit (1 per user per trip per 5 min, via report_crowd RPC).
 
DESIGN: light map-first premium UI, draggable bottom sheet, floating tab bar
(Explore, Live, Nearby, Routes, Saved), dot-matrix route badges, ticket-style result
cards, cobalt #3451F2 and ink #0E1433, Bricolage Grotesque + Figtree + DotGothic16 +
Noto Sans Kannada, Framer Motion animations, reduced-motion respected.
 
DELIVERABLES:
- Edit the project files directly. Do NOT paste code or diffs in the chat.
- Reply with only a short summary of what changed (files touched, anything I must do manually).
```
 