# PROJECT ZENITH: Real-Time Satellite & Planetary Tracking System

### 🌐 Site is Live: **[Click Here](https://project-zenith-h9mc.onrender.com/)**

Project Zenith is a high-fidelity, interactive aerospace tracking terminal designed to monitor satellite trajectories, ground station sector passes, and celestial body configurations in real-time. Built using a dual-deck split-view HUD architecture, the application overlays live telemetry computations on a 3D hemispherical sky dome to calculate relative azimuth, elevation, parallactic distance, and conjunction alerts relative to Noida Ground Station (preset) or custom coordinates.

---

## 🚀 Website Functionality & Unique Features

Project Zenith is split into two specialized workspaces designed to organize complex tracking data without clutter:

### 1. The Observer Deck (Visual sky modeling)
* **[01] Live Sky Story**: A real-time, parsed monospace narrative describing visible passes, planetary events, and conjunction threats with color-coded key tags (e.g., orange for ISS, yellow for the Moon, amber for direction coordinates).
* **[02] Noida Ground Station Presets**: Displays ground station location data (`GS_LOC: NOIDA, INDIA`), live invisible visible count tracking, coordinates, and closest target range.
* **[03] LEO Altitude Chamber**: Toggleable visualization of satellite positions arranged by their orbital altitudes (Low Earth Orbit ranges) featuring:
  * **[03-A] 3D Chamber**: An interactive 3D cylinder projecting satellite heights and sensor sweep cones.
  * **[03-B] Telemetry Log**: A detailed, scrollable tabular list of NORAD IDs, current visibility status (`ACQ` or `LOS`), and heights.
* **[04] Zenith Radar Hemisphere (3D Sky Dome)**: 
  * Displays a full 3D interactive celestial canvas mapping stars, satellites, and planets.
  * Supports dual-projection modes: **Half Dome** (visible sky mask) and **Full Sphere** (complete orbital path visualizer ghosting targets below the horizon).
  * Centered on a pulsing Ground Station Sonar ring emitter.
  * Shows dotted vectorized orbital guides for major celestial bodies (Sun in amber, Moon in yellow).
* **[05] Time Machine Controls**: A 24-hour chrono-temporal slider backed by a custom SVG oscillator waveform, allowing users to project paths past or future.
* **[08] Conjunction Alerts Grid**: A real-time threat board showing flashes for active conjunctions and green nominal state checks across Noida's 9 monitored aerospace sectors.

### 2. The Analyst Deck (Deep scientific metric logs)
* **[05-B] Target Intelligence Profile**: Clicking on any satellite in the 3D dome or the LEO list instantly locks a telemetry tracker displaying:
  * NORAD launch statistics, operators, and mission profiles.
  * An auto-rotating 3D vector wireframe hologram matching the object's class (e.g., modular space station, flat-panel communications arrays, scientific boxes, or spent cylindrical debris).
* **[06] Parallactic Depth Ladder**: A height-sorted list of all 9 major celestial bodies mapping their physical distance, elevation, and visibility.
* **[07] Sun & Shadow Zero-Profile**: Real-time solar transit elevation tracking calculating shadow ratio formula $\cot(\text{elevation})$. Diminishes the Sun indicator when positioned below the horizon.

---

## 🛠️ Technology Stack & Dependencies

The project is built on a decoupled Client-Server architecture:

### 1. Frontend (Single-Page Application)
* **Core Framework**: React 19 (Hooks, Stateful conditional grids)
* **Build System**: Vite 8 (Hot Module Replacement, Rolldown bundling)
* **3D Visualizer Scene**: Three.js & `@react-three/fiber` (React wrapper)
* **WebGL Helpers**: `@react-three/drei` (HTML overlays, Starfield shaders, Orbit controls)
* **Aesthetics & Styling**: CSS Grid & TailwindCSS 4 (Glassmorphic cards, thin chamfer borders, high-contrast neon palette)
* **Effects**: `@react-three/postprocessing` (Selective Bloom, Vignette, Chromatic Aberration filters)

### 2. Backend (Astronomical Telemetry Engine)
* **Framework**: FastAPI (High-performance asynchronous Python API)
* **Asynchronous Server**: Uvicorn
* **Ephemeris Calculations**: Skyfield (Standard Python library for high-precision astronomy)
* **Data Processing**: NumPy (Vectorized coordinate matrices)
* **Ephemeris Data Source**: NASA Jet Propulsion Laboratory (JPL DE421 ephemeris)
* **TLE Database**: CelesTrak (Visual bright visual magnitude group)

---

## ⚙️ Installation & Setup Instructions

Ensure you have **Python 3.9+** and **Node.js 18+** installed on your system.

### Step 1: Clone and Set Up the Backend
1. Navigate to the project root directory:
   ```bash
   cd PROJECT-ZENITH
   ```
2. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI backend server:
   ```bash
   python main.py
   ```
   *The server will spin up on `http://127.0.0.1:8000`.*

### Step 2: Set Up and Run the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Start the Vite local development server:
   ```bash
   npm run dev
   ```
   *Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).*

### Step 3: Build for Production (Optional)
To verify or compile the final client-side assets:
```bash
npm run build
```
This builds static minified HTML, CSS, and JS chunks into the `dist/` directory.

---

## 📐 Architecture & Implementation Approach

### 1. Coordinate Computations
The FastAPI backend reads satellite TLE data and computes geographical coordinate vectors. It converts standard **GCRS (Geocentric Celestial Reference System)** variables into **Topocentric AltAz (Altitude-Azimuth)** systems using Noida's latitude/longitude offsets, calculating range, velocity, and visibility parameters.

```
       [ CelesTrak TLEs ]          [ JPL DE421 Ephemeris ]
               │                              │
               ▼                              ▼
     [ Skyfield AltAz Compute ] ──► [ Spherical Law of Cosines ]
               │                              │
               ▼                              ▼
    [ AltAz Vector Outputs ]        [ Conjunction Angular Gaps ]
               │
               ▼
   [ FastAPI JSON API Stream ]
               │
               ▼
  [ React Client state loops ] ──► [ AltAz-to-ThreeJS Vector Mapping ]
```

### 2. AltAz-to-WebGL Vector Mapping
Inside `OrbitalDome3D.jsx`, relative spherical coordinates are mapped onto three-dimensional WebGL Cartesian space using standard trigonometric conversions:
$$\phi = (90^\circ - \text{elevation}) \times \frac{\pi}{180^\circ}$$
$$\theta = \text{azimuth} \times \frac{\pi}{180^\circ}$$
$$x = r \sin(\phi) \sin(\theta), \quad y = r \cos(\phi), \quad z = -r \sin(\phi) \cos(\theta)$$
This ensures that the north celestial pole ($0^\circ$ Azimuth) aligns perfectly with the visual **"N"** compass label at the top of the Sky Dome.

### 3. State Synchronization
* When the user adjusts the **Time Machine** slider, the state is dispatched to the backend, which recalculates ephemeris coordinates at the offset time.
* Selection is bidirectionally unified: clicking a node in the 3D Sky Dome highlights it in the **LEO Altitude Chamber** and loads its profile in the **Target Intelligence** panel instantly.

---

## 🔮 Future Enhancements

* **Machine-Learning Path Predictions**: Implementing Keplerian drift predictors directly on the client to estimate orbits when offline.
* **Multi-Ground-Station Hub**: Supporting toggleable presets for secondary stations (e.g., Kourou, Svalbard, Goldstone) to compare line-of-sight visual fields.
* **Atmospheric Refraction Correction**: Incorporating atmospheric density models to shift coordinates near the horizon, correcting for real-world optical refraction.
