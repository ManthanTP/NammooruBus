# Nammooru Bus — End-to-End Demonstration Script

A step-by-step walkthrough script for presentations, evaluators, viva/project demonstrations, and user onboarding.

---

## Demo Overview (Total Duration: ~8–10 Minutes)

| Act | Scene | Key Feature Demonstrated |
| :--- | :--- | :--- |
| **Act 1** | Landing Page & Direct APK Download | Brand gradient, bilingual switch, QR code, one-tap APK download |
| **Act 2** | Commuter Exploration & Journey Planner | Guest mode, From/To search, fare estimate, road-snapped map route |
| **Act 3** | Driver Console & Shift Start | Driver shift, assigned bus chip, active status & crowd level broadcast |
| **Act 4** | Live Passenger Tracking | Real-time map, You dot, approaching bus ETA, leave-now verdict, SOS share |
| **Act 5** | Crowdsourcing & Complaints | Crowd report submission, grievance filing with instant confirmation |
| **Act 6** | Administrative Oversight & Simulator | Single-brand admin panel, live fleet monitor, complaint resolution, audit log |
| **Act 7** | Themes, Kannada & Offline Reliability | Light/Dark/Blue themes, 100% Kannada orthography, airplane mode cached timetable |

---

## Detailed Step-by-Step Script

### Act 1: Landing Page & APK Download
1. **Open Landing Page**: Navigate to `https://nammoorubus.vercel.app/` (or `http://localhost:5173/`).
2. **Hero & Download Call to Action**:
   - Point out the signature cobalt-to-navy brand gradient (`--grad-brand`) with white text.
   - Click the prominent **Download for Android** button in the hero or top bar: shows the real version (`v1.0.0`), file size (`15.1 MB`), and triggers direct APK download.
   - Scroll down to the **App** section: show the inline SVG QR code for mobile scanning.
3. **Smooth Scroll & Navigation**:
   - Click "Features", "How it works", "FAQ" in the top bar: observe smooth scrolling and active sliding pill nav indicator.

### Act 2: Guest Search & Trip Planning
1. **Continue as Guest**: Click **Continue as guest** on the hero. The app opens directly to `/explore` without requiring signup or personal information.
2. **From / To Stop Search**:
   - Tap "From": select **Old Bus Stand (CBT)**.
   - Tap "To": select **Airport**.
   - Tap the animated **Swap** button: observe instant stop swap with haptic feedback.
   - Tap **Find Buses**: results screen lists available direct and connecting buses with travel duration and fare breakdown.
3. **Journey Details**:
   - Tap on Route 201: see the road-following colored polyline, list of sequenced stops, and live comparison between walking and taking the bus.

### Act 3: Driver Shift Simulation
1. **Sign in as Driver**: Open a private window or switch accounts:
   - Navigate to `/login` and sign in with driver credentials (or use the mock driver toggle).
   - The user is automatically redirected to `/driver`.
2. **Start Shift**:
   - The driver console displays the driver's name and assigned vehicle registration (e.g. `KA-25-F-0321`).
   - Select Route (e.g. `Route 12 - Chennamma Circle to Airport`).
   - Choose Direction: `Forward (0)` $\rightarrow$ Tap **Start Shift**.
3. **Trip Dashboard (`/driver/trip`)**:
   - Show live GPS broadcast indicator and speed metrics.
   - Tap transit status button: change to **On Time** (green) or **Delayed** (amber).
   - Tap crowd level: update to **Seats Free** (`empty`), **Filling Up** (`moderate`), or **Packed** (`full`).

### Act 4: Live Commuter Tracking
1. **Passenger Live View**: Switch back to passenger view on `/live?route=12`:
   - Commuter sees the pulsing green/blue bus icon moving on the road path.
   - The **"You" location dot** shows distance to the nearest stop.
   - The smart **Leave-Now Verdict** tells the commuter whether they can catch the bus by walking now or should wait for the next headway.
2. **SOS Emergency Share**:
   - Tap and hold the red SOS button for 1 second $\rightarrow$ triggers haptic pulse and opens native/WhatsApp live trip tracking link to emergency contacts.

### Act 5: Crowdsourcing & Grievances
1. **Report Crowd**: Tap "Report crowd" on `/live` $\rightarrow$ choose "Moderate" $\rightarrow$ updates live crowd meter instantly.
2. **File Complaint**: Navigate to `/complaints` $\rightarrow$ select Route 12 $\rightarrow$ category "Bus Delay" $\rightarrow$ submit grievance. Shows immediate toast and confirmation ticket ID.

### Act 6: Administrative Control
1. **Open Admin Portal**: Navigate to `/12345678/admin/dashboard`:
   - Point out single-brand control panel (sidebar on desktop, no duplicate top header).
   - **Live Monitor (`/admin/live`)**: displays all active buses across Hubballi-Dharwad on a central operational map.
   - **Complaints (`/admin/complaints`)**: view submitted ticket and update status from `pending` to `resolved`.
   - **Audit Logs (`/admin/audit`)**: demonstrates immutable database trigger log recording every database operation with actor ID and timestamp.

### Act 7: Kannada Parity, 3 Themes & Offline Demo
1. **Bilingual Kannada Switch**:
   - Click the language toggle pill `EN | ಕನ್ನಡ`.
   - Entire interface instantaneously transforms into pure Kannada with zero layout clipping or unlocalized keys.
2. **3 Themes Demo**:
   - Switch between **Light**, **Dark**, and **Blue** themes in the theme toggle.
   - Demonstrate that driver trip cards, history tables, admin grids, and modals maintain high-contrast readability with zero white boxes or glare.
3. **Airplane Mode / Offline Demo**:
   - Turn off Wi-Fi / simulate offline in DevTools Network tab.
   - The friendly offline amber banner appears: *"Offline. Showing saved timetable."*
   - Commuter can still browse cached routes, stops, and schedules seamlessly from local storage without network drops!
