# PROJECT ZENITH: Real-Time Satellite & Planetary Tracking System

### 🌐 Site is Live: **[Click Here](https://project-zenith-h9mc.onrender.com/)**

Project Zenith is a high-fidelity, interactive aerospace tracking terminal designed to monitor satellite trajectories, ground station sector passes, and celestial body configurations in real-time. Built using a dual-deck split-view HUD architecture, the application overlays live telemetry computations on a 3D hemispherical sky dome to calculate relative azimuth, elevation, parallactic distance, and conjunction alerts relative to Noida Ground Station (preset) or custom coordinates.

---

## 🚀 Website Functionality & Unique Features

Project Zenith is split into two specialized workspaces designed to organize complex tracking data without clutter:

## 🚀 Website Functionality & Unique Features

Project Zenith is split into two specialized workspaces designed to organize complex tracking data without clutter.

The platform intentionally uses aerospace-inspired tactical naming conventions. For accessibility and educational purposes, every module contains explanatory hover descriptions inside the application interface describing its scientific function and purpose.

### 1. The Observer Deck (Visual Sky Modeling)

* **[01] TACTICAL OVERHEAD REPORT** *(formerly Live Sky Story)*

  A real-time parsed narrative describing visible satellite passes, planetary events, illumination changes, and conjunction threats.

  Educational hover descriptions explain orbital events, visibility conditions, and celestial motion in plain language.

* **[02] ZENITH PASS METRICS** *(formerly Zenith Snapshot)*

  Displays observer telemetry including:

  * coordinates
  * visible object counts
  * acquisition statistics
  * closest tracked target
  * observer state information

  Hover descriptions provide simplified explanations for educational use.

* **[03] ACTIVE ORBITAL REGISTRY** *(formerly Satellite Tracker)*

  Interactive orbital catalogue displaying tracked objects organized by orbital altitude.

  Includes:

  * **[03-A] Orbital Chamber**

    Interactive 3D cylindrical visualization of orbital positions and sensor sweep cones.

  * **[03-B] Registry Logs**

    Detailed telemetry listing containing:

    * NORAD identifiers
    * acquisition states
    * LOS events
    * altitude measurements

* **[04] TACTICAL HORIZON RADAR / TACTICAL CELESTIAL SPHERE**
  *(formerly Overhead Radar)*

  Full three-dimensional celestial visualization displaying:

  * satellites
  * planets
  * stars
  * orbital paths
  * projected trajectories

  Supports:

  * Half Dome mode
  * Full Sphere mode

  Includes educational overlays describing celestial coordinate systems and object positioning.

* **[05] TEMPORAL ORBIT PROPAGATOR**
  *(formerly Time Machine)*

  Chrono-temporal control system allowing users to project orbital positions into past and future time windows.

  Uses a 24-hour propagation model with custom SVG timeline controls.

* **[08] PROXIMITY & CONJUNCTION ALERTS**
  *(formerly Conjunction Alerts)*

  Real-time conjunction monitoring board identifying close angular encounters between tracked satellites and celestial bodies.

  Displays:

  * warnings
  * critical events
  * nominal states

---

### 2. The Analyst Deck (Deep Scientific Metrics)

* **[05-B] ACQUISITION INTEL ANALYSIS**
  *(formerly Target Intelligence Profile)*

  Selecting an object immediately loads:

  * mission statistics
  * operators
  * launch history
  * classification metadata

  Includes animated object representations corresponding to satellite architecture.

* **[06] CELESTIAL RANGE & ILLUMINATION**
  *(formerly Distance & Phase)*

  Height-sorted catalogue of celestial bodies displaying:

  * distance
  * illumination
  * elevation
  * phase information
  * visibility

  Educational overlays explain astronomical concepts for learners.

* **[07] SOLAR ALTITUDE & SHADOW MATRIX**
  *(formerly Sun & Shadow)*

  Real-time solar transit analysis calculating:
  $$\cot(\text{elevation})$$
  to estimate relative shadow ratios and illumination geometry.
  Intended as an educational demonstration of solar altitude effects and observational astronomy principles.

---

### Educational Accessibility
Although Project Zenith adopts aerospace-inspired terminology for immersion and interface consistency, all modules provide contextual hover explanations intended for educational purposes, enabling users unfamiliar with orbital mechanics or astronomy to understand the displayed scientific data intuitively.


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
