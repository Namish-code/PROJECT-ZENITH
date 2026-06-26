import React, { useState, useEffect, useRef } from 'react';
import { Radio, ShieldAlert, Clock, Compass, Globe, Orbit } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import OrbitalDome3D from './OrbitalDome3D';
import SatelliteCylinder3D from './SatelliteCylinder3D';
import IntroSequence from './IntroSequence';



// ─── TOOLTIP COMPONENT ────────────────────────────────────────────────────────
// Wraps any element. On hover, shows a plain-English explanation above it.
// Styled to match the existing cyan/dark mission-control aesthetic.
function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {/* small "?" badge to signal interactivity */}
      <span className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-cyan-500/40 text-cyan-500/60 text-[8px] font-black leading-none cursor-help select-none">
        ?
      </span>
      {visible && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-64 p-3 bg-[#020d14]/95 border border-cyan-500/30 rounded-sm shadow-xl shadow-black/80 backdrop-blur-sm pointer-events-none"
          style={{ minWidth: '220px' }}
        >
          {/* little arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-cyan-500/30" />
          <p className="text-cyan-100/90 text-[11px] font-sans font-normal leading-relaxed tracking-normal">
            {text}
          </p>
        </div>
      )}
    </span>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// --- SUB-COMPONENT: ROTATING TEXTURE-MAPPED CELESTIAL DISKS ---
function OrbitalMiniRender({ color, segments, isOverhead, name }) {
  function RotatingMesh() {
    const meshRef = useRef();
    const [loadedTexture, setLoadedTexture] = useState(null);
    
    // Cloud database URLs for NASA/ESA open satellite surface maps
    const TEXTURES = {
      Moon: 'https://unpkg.com/three-textures@1.2.0/textures/moon.jpg',
      Mars: 'https://unpkg.com/three-textures@1.2.0/textures/mars.jpg',
      Jupiter: 'https://unpkg.com/three-textures@1.2.0/textures/jupiter.jpg',
      Venus: 'https://unpkg.com/three-textures@1.2.0/textures/venus_atmosphere.jpg',
      Mercury: 'https://unpkg.com/three-textures@1.2.0/textures/mercury.jpg',
      Saturn: 'https://unpkg.com/three-textures@1.2.0/textures/saturn.jpg',
      Uranus: 'https://unpkg.com/three-textures@1.2.0/textures/uranus.jpg',
      Neptune: 'https://unpkg.com/three-textures@1.2.0/textures/neptune.jpg'
    };

    useEffect(() => {
      if (!TEXTURES[name]) {
        setLoadedTexture(null);
        return;
      }
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        TEXTURES[name], 
        (t) => setLoadedTexture(t), 
        undefined, 
        () => setLoadedTexture(null)
      );
    }, [name]);

    useFrame(({ clock }) => {
      if (meshRef.current) {
        meshRef.current.rotation.y = clock.getElapsedTime() * 0.4;
      }
    });

    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.15, 32, 32]} />
        {loadedTexture ? (
          <meshStandardMaterial 
            map={loadedTexture} 
            color={color}
            roughness={0.6} 
            metalness={0.1}
            opacity={isOverhead ? 1 : 0.25} 
            transparent 
          />
        ) : (
          <meshStandardMaterial 
            color={color}
            roughness={0.6} 
            metalness={0.1}
            opacity={isOverhead ? 1 : 0.25} 
            transparent 
          />
        )}
      </mesh>
    );
  }

  return (
    <Canvas camera={{ position: [0, 0, 3.2], fov: 50 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 2, 2]} intensity={1.5} />
      <RotatingMesh />
    </Canvas>
  );
}

// --- SUB-COMPONENT: DYNAMIC 3D HOLOGRAPHIC WIREFRAME ---
function SatelliteHologram({ name, color }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.4;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.25) * 0.25;
    }
  });

  const n = name?.toUpperCase() || "";

  // Build high-tech geometries based on satellite classification
  if (n.includes("ISS")) {
    return (
      <group ref={meshRef}>
        {/* Core Cylinders */}
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 1.1, 8]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Horizontal Solar Truss */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 8]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Large Solar Panels wings */}
        <mesh position={[0.9, 0, 0]}>
          <boxGeometry args={[0.25, 1.4, 0.02]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        <mesh position={[-0.9, 0, 0]}>
          <boxGeometry args={[0.25, 1.4, 0.02]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
      </group>
    );
  }

  if (n.includes("TIANGONG") || n.includes("CSS") || n.includes("TIANHE")) {
    return (
      <group ref={meshRef}>
        {/* Core Cylinder */}
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 1.2, 8]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Radial docking nodes */}
        <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Solar wings */}
        <mesh position={[0, -0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.18, 2.0, 0.02]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
      </group>
    );
  }

  if (n.includes("R/B") || n.includes("ROCKET")) {
    return (
      <group ref={meshRef}>
        {/* Discarded upper stage cylinder body */}
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 1.4, 8]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Engine nozzle cone */}
        <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.35, 8, true]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Payload attachment ring */}
        <mesh position={[0, 0.72, 0]}>
          <torusGeometry args={[0.18, 0.03, 6, 12]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
      </group>
    );
  }

  if (n.includes("STARLINK")) {
    return (
      <group ref={meshRef}>
        {/* Flat compact panel chassis */}
        <mesh>
          <boxGeometry args={[0.4, 0.65, 0.07]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Singular massive solar wing extended */}
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.15, 1.0, 0.01]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        {/* Inter-satellite laser link nodes */}
        <mesh position={[0.18, -0.28, 0]}>
          <boxGeometry args={[0.07, 0.07, 0.07]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
      </group>
    );
  }

  // Standard Scientific/Observation Satellites (OAO, SERT, Seasat, Astex, Isis)
  return (
    <group ref={meshRef}>
      {/* Central box body */}
      <mesh>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      {/* Antenna dish */}
      <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.25, 8, true]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      {/* Symmetrical dual solar panels */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[1.8, 0.16, 0.02]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
}

// --- SUB-COMPONENT: LIVE UPLINK SIGNAL WAVEFORM ---
function LiveSignalWaveform() {
  const pathRef = useRef();
  const [signalStrength, setSignalStrength] = useState(-92.4);

  useEffect(() => {
    const timer = setInterval(() => {
      setSignalStrength(prev => {
        const change = (Math.random() - 0.5) * 1.5;
        const nextVal = prev + change;
        return parseFloat(Math.max(-105, Math.min(-80, nextVal)).toFixed(1));
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let animationFrameId;
    let t = 0;
    
    const updateWave = () => {
      t += 0.15;
      const points = [];
      const width = 180;
      const height = 40;
      const midY = height / 2;
      
      for (let x = 0; x <= width; x += 3) {
        const wave1 = Math.sin(x * 0.08 - t) * 8;
        const wave2 = Math.sin(x * 0.2 + t * 1.5) * 3;
        const noise = (Math.random() - 0.5) * 2;
        const y = midY + wave1 + wave2 + noise;
        points.push(`${x},${y}`);
      }
      
      if (pathRef.current) {
        pathRef.current.setAttribute('d', `M ${points.join(' L ')}`);
      }
      
      animationFrameId = requestAnimationFrame(updateWave);
    };
    
    updateWave();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="mt-3.5 p-2.5 bg-black/60 border border-cyan-950/60 rounded-sm relative overflow-hidden flex flex-col">
      <div className="flex justify-between items-center text-[10px] text-cyan-500 font-bold mb-1 tracking-widest">
        <span>UPLINK SIGNAL MONITORS</span>
        <span className="text-emerald-400 animate-pulse">ACTIVE_NOISE: {signalStrength}dBm</span>
      </div>
      <div className="h-10 w-full relative">
        <svg className="w-full h-full text-cyan-400 fill-none stroke-current stroke-[1.2]" viewBox="0 0 180 40" preserveAspectRatio="none">
          <path ref={pathRef} />
        </svg>
      </div>
    </div>
  );
}

// Helper to retrieve user-friendly location name based on coordinates
function getLocationName(lat, lon) {
  if (Math.abs(lat - 28.53) < 1 && Math.abs(lon - 77.39) < 1) return "NOIDA, INDIA";
  if (Math.abs(lat - 48.8566) < 1 && Math.abs(lon - 2.3522) < 1) return "PARIS, FRANCE";
  if (Math.abs(lat - 51.5074) < 1 && Math.abs(lon - 0) < 1) return "LONDON, UK";
  if (Math.abs(lat - 40.7128) < 1 && Math.abs(lon - (-74.0060)) < 1) return "NEW YORK, USA";
  if (Math.abs(lat - 35.6762) < 1 && Math.abs(lon - 139.6503) < 1) return "TOKYO, JAPAN";
  if (Math.abs(lat - (-33.8688)) < 1 && Math.abs(lon - 151.2093) < 1) return "SYDNEY, AUSTRALIA";
  return "CUSTOM STATION";
}

// Helper to estimate timezone offsets based on latitude/longitude
function getTargetTimezoneOffset(lat, lon) {
  if (Math.abs(lat - 28.53) < 1 && Math.abs(lon - 77.39) < 1) return 5.5;
  if (Math.abs(lat - 48.8566) < 1 && Math.abs(lon - 2.3522) < 1) return 2.0;
  if (Math.abs(lat - 51.5074) < 1 && Math.abs(lon - 0) < 1) return 1.0;
  if (Math.abs(lat - 40.7128) < 1 && Math.abs(lon - (-74.0060)) < 1) return -4.0;
  if (Math.abs(lat - 35.6762) < 1 && Math.abs(lon - 139.6503) < 1) return 9.0;
  if (Math.abs(lat - (-33.8688)) < 1 && Math.abs(lon - 151.2093) < 1) return 10.0;
  return Math.round((lon / 15.0) * 2) / 2;
}

function getSatelliteSummary(name) {
  const n = name.toUpperCase();
  
  if (n.includes("ISS (ZARYA)")) {
    return {
      origin: "INTERNATIONAL COALITION (NASA/ROSCOSMOS/ESA/JAXA/CSA)",
      purpose: "MANNED ORBITAL LABORATORY",
      launched: "1998-11-20",
      description: "The largest human-made structure in space. Serves as a microgravity research facility testing scientific frameworks, biological systems, and deep-space survival technologies."
    };
  }
  if (n.includes("CSS") || n.includes("TIANHE") || n.includes("TIANGONG")) {
    return {
      origin: "CHINA (CNSA)",
      purpose: "MANNED ORBITAL STATION",
      launched: "2021-04-29",
      description: "Core module of the Tiangong space station. Serves as the primary control center and living quarters for taikonauts conducting long-duration aerospace scientific experiments."
    };
  }
  if (n.includes("STARLINK")) {
    return {
      origin: "USA (SPACEX)",
      purpose: "GLOBAL TELECOMMUNICATIONS",
      launched: "DYNAMIC DEPLOYMENTS",
      description: "Part of a massive low-Earth orbit constellation designed by SpaceX to deliver high-speed, low-latency broadband internet connection to remote and underserved locations worldwide."
    };
  }
  if (n.includes("SL-3") || n.includes("SL-8") || n.includes("SL-14") || n.includes("SL-16")) {
    return {
      origin: "USSR / RUSSIA (ROSCOSMOS)",
      purpose: "ROCKET DEBRIS (SPENT STAGE)",
      launched: "HISTORICAL LAUNCHES",
      description: "A discarded rocket upper stage (e.g., Kosmos or Tsyklon booster). It remains in orbit as inert space debris, tracked because of its large radar cross-section and bright visual signature."
    };
  }
  if (n.includes("ATLAS") || n.includes("CENTAUR") || n.includes("DELTA")) {
    return {
      origin: "USA (NASA / US AIR FORCE)",
      purpose: "ROCKET DEBRIS (SPENT STAGE)",
      launched: "HISTORICAL LAUNCHES",
      description: "A spent upper booster stage from a historical American satellite launch. Tracked continuously as space debris to prevent collision hazards with active space assets."
    };
  }
  if (n.includes("OAO")) {
    return {
      origin: "USA (NASA)",
      purpose: "ASTRONOMICAL OBSERVATORY",
      launched: "1968 / 1972",
      description: "Orbiting Astronomical Observatory. Pioneer space telescope series that provided the first high-quality ultraviolet observations of stars, galaxies, and planetary atmospheres."
    };
  }
  if (n.includes("SERT")) {
    return {
      origin: "USA (NASA)",
      purpose: "ION PROPULSION RESEARCH",
      launched: "1970-02-04",
      description: "Space Electric Rocket Test. Experimental satellite designed to evaluate the long-duration performance and efficiency of electrostatic ion thrusters in a vacuum environment."
    };
  }
  if (n.includes("SEASAT")) {
    return {
      origin: "USA (NASA / JPL)",
      purpose: "OCEANOGRAPHIC REMOTE SENSING",
      launched: "1978-06-27",
      description: "The first Earth-orbiting satellite designed for remote sensing of the Earth's oceans using synthetic aperture radar (SAR), pioneering modern radar oceanography."
    };
  }
  if (n.includes("ASTEX")) {
    return {
      origin: "USA (US MILITARY)",
      purpose: "EXPERIMENTAL COMMUNICATIONS",
      launched: "1971-10-17",
      description: "Advanced Space Technology Experiment. Evaluated early military satellite communications, radio propagation, and infrared sensor operations in LEO orbit."
    };
  }
  if (n.includes("ISIS")) {
    return {
      origin: "CANADA / USA (CRC / NASA)",
      purpose: "IONOSPHERIC GEOPHYSICAL STUDY",
      launched: "1969 / 1971",
      description: "International Satellites for Ionospheric Studies. Scientific spacecraft used to monitor upper-atmospheric radio propagation and the Earth's auroral zones."
    };
  }
  if (n.includes("THOR")) {
    return {
      origin: "USA (US AIR FORCE)",
      purpose: "ROCKET DEBRIS (SPENT STAGE)",
      launched: "HISTORICAL LAUNCHES",
      description: "Spent upper booster rocket stage from a US military or scientific launch. Remains in orbit as inert space debris and is tracked for orbital safety."
    };
  }
  if (n.includes("NIMBUS")) {
    return {
      origin: "USA (NASA)",
      purpose: "METEOROLOGICAL REMOTE SENSING",
      launched: "HISTORICAL LAUNCHES",
      description: "Pioneering weather research satellite series. Nimbus satellites tested advanced meteorological sensors, mapping ozone levels, global ice cover, and atmospheric profiles."
    };
  }
  if (n.includes("LANDSAT")) {
    return {
      origin: "USA (NASA / USGS)",
      purpose: "LAND USE REMOTE SENSING",
      launched: "HISTORICAL LAUNCHES",
      description: "Part of the longest-running civilian Earth observation program, capturing high-resolution multispectral imagery of Earth's land surfaces for resource management."
    };
  }
  
  return {
    origin: "GLOBAL TELECOM / RESEARCH",
    purpose: "LEO COMMUNICATIONS & SCIENCE",
    launched: "METRIC DEPENDENT",
    description: "Tracked aerospace payload. Actively propagating through local sky sector coordinates. Altitude: LEO orbit. Orbit type: Low Earth Orbit (LEO)."
  };
}

// ─── TOOLTIP TEXT DEFINITIONS ─────────────────────────────────────────────────
const TIPS = {
  liveSkyStory:
    "A plain-English description of what's happening in the sky above your chosen location right now — updated live as satellites and planets move.",
  zenithSnapshot:
    "A quick summary of the objects currently visible above you: how many, which one is closest, how far away it is, and which direction to look.",
  satelliteTracker:
    "A live list of satellites passing through the sky above you. Tap any satellite to see its 3D shape, who built it, and what it's used for.",
  overheadRadar:
    "A radar-style map of your sky viewed from above. The centre is directly overhead (your zenith). Objects near the centre are almost straight above you; objects near the edge are low on the horizon.",
  timeMachine:
    "Drag the slider left to see the sky as it was up to 24 hours ago, or right to preview what will be overhead up to 24 hours from now.",
  distancePhase:
    "Shows every planet, the Moon, and the Sun — how far away each one is and whether it's currently above your horizon or hidden below it.",
  sunShadow:
    "Tracks the Sun's angle in your sky. Near the equator, it shows the exact date when the Sun is so directly overhead that objects cast almost no shadow at all.",
  conjunctionAlerts:
    "Automatically detects rare moments when two or more space objects (like the ISS and a planet) are nearly overhead at the same time — a special event worth looking up for.",
};
// ─────────────────────────────────────────────────────────────────────────────

// --- MAIN MASTER COMMAND CONTROL DECK ---
export default function App() {
  const [coords, setCoords] = useState({ lat: 40.7128, lon: -74.0060 });
  const [showIntro, setShowIntro] = useState(true);

  const { lat: LAT, lon: LON } = coords;

  const [telemetry, setTelemetry] = useState(null);
  const [timeOffset, setTimeOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectionMode, setProjectionMode] = useState('HALF');
  const [clocks, setClocks] = useState({ sysTime: '00:00:00', locTime: '00:00:00' });
  const [selectedSatId, setSelectedSatId] = useState(null);

  useEffect(() => {
    function updateClocks() {
      const now = new Date();
      const sysTimeStr = now.toLocaleTimeString('en-US', { hour12: false });
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const targetOffset = getTargetTimezoneOffset(LAT, LON);
      const targetTime = new Date(utcTime + 3600000 * targetOffset);
      const locTimeStr = targetTime.toLocaleTimeString('en-US', { hour12: false });
      setClocks({ sysTime: sysTimeStr, locTime: locTimeStr });
    }
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [LAT, LON]);

  useEffect(() => {
    async function fetchSpaceData(showLoading = true) {
      try {
        if (showLoading) setLoading(true);
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/zenith-telemetry?lat=${LAT}&lon=${LON}&time_offset_hours=${timeOffset}`
        );
        if (!response.ok) throw new Error("Ground station data pipeline dropped.");
        const data = await response.json();
        setTelemetry(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        if (showLoading) setLoading(false);
      }
    }

    const delayDebounce = setTimeout(() => { fetchSpaceData(true); }, 150);
    let pollInterval = null;
    if (timeOffset === 0) {
      pollInterval = setInterval(() => { fetchSpaceData(false); }, 5000);
    }
    return () => {
      clearTimeout(delayDebounce);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [timeOffset, LAT, LON]);

  const visibleSats = telemetry?.satellites?.filter(s => s.is_visible) || [];
  const closestSat = visibleSats.length > 0
    ? visibleSats.reduce((prev, curr) => (prev.range_km < curr.range_km ? prev : curr))
    : null;

  const activeSat = telemetry?.satellites?.find(s => s.id === selectedSatId)
    || closestSat
    || (telemetry?.satellites?.length > 0 ? telemetry.satellites[0] : null);

  const satInfo = activeSat ? getSatelliteSummary(activeSat.name) : null;
  const isCurrentlyPassing = activeSat ? activeSat.is_visible : false;

  const activeTransits = telemetry?.satellites?.filter(s => {
    const n = s.name.toUpperCase();
    const isStation = n.includes('ISS') || n.includes('CSS') || n.includes('TIANHE') || n.includes('TIANGONG');
    return isStation && s.elevation > 10;
  }) || [];

  const sunObj = telemetry?.cosmic_objects?.find(o => o.name === "Sun");
  const sunElevation = sunObj ? sunObj.elevation : -1;
  let shadowRatioText = "NO SUNLIGHT";
  let sunPhaseText = "NIGHT";
  if (sunElevation > 0) {
    sunPhaseText = sunElevation > 75 ? "APEX TRANSIT" : sunElevation > 30 ? "DIURNAL ARC" : "HORIZON PROXIMITY";
    const rad = (sunElevation * Math.PI) / 180;
    const ratio = 1 / Math.tan(rad);
    shadowRatioText = ratio < 0.01 ? "0.00 (ZERO SHADOW)" : `${ratio.toFixed(2)}x`;
  }

  return (
    <>
      {showIntro && (
        <IntroSequence
          onIntroComplete={() => setShowIntro(false)}
          onCoordinatesSet={(c) => setCoords(c)}
        />
      )}
      <div className="min-h-screen bg-scanlines text-gray-300 font-mono text-[11px] p-3 overflow-x-hidden select-none relative">
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#04060b]/60 to-[#020306] pointer-events-none z-0"></div>

      {/* 1. TOP TACTICAL INSTRUMENT BAR */}
      <header className="relative z-10 border border-cyan-500/30 bg-black/15 backdrop-blur-sm mb-4 rounded-sm shadow-md shadow-black/80 grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-cyan-500/20 text-[13px]">
        <div className="p-3.5 flex items-center justify-between bg-cyan-500/5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-black tracking-[0.2em] text-cyan-400 uppercase">SYS_NODE // ZENITH</span>
          </div>
          <span className="text-cyan-600/60 font-bold">LST-4.02</span>
        </div>

        <div className="p-3.5 lg:col-span-2 flex items-center justify-between gap-3 overflow-hidden bg-amber-500/5">
          <div className="flex items-center gap-3 truncate">
            <span className="text-amber-500 font-black tracking-widest shrink-0 animate-pulse">[ALERT_LOG]:</span>
            <div className="text-amber-300 tracking-wide truncate uppercase font-medium">
              {telemetry?.conjunctions && telemetry.conjunctions.length > 0 ? (
                <span className="animate-pulse">
                  !! CRITICAL CONJUNCTION DETECTED !! {telemetry.conjunctions[0].satellite} RANGE APEX TO {telemetry.conjunctions[0].target} // SEP: {telemetry.conjunctions[0].separation}°
                </span>
              ) : (
                <span className="text-cyan-400/70 tracking-widest">SKY_TRACKER_NOMINAL // MONITORING SECTORS 01-09 // PARALLAX CLEAR</span>
              )}
            </div>
          </div>
          {activeTransits.length > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 bg-rose-950/80 border border-rose-500 text-rose-400 text-[10px] font-black rounded-sm animate-pulse">
              <ShieldAlert size={12} />
              <span>OVERHEAD PASS ACTIVE: {activeTransits[0].name.replace(" (ZARYA)", "").toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="p-3.5 flex items-center justify-between text-cyan-500/70">
          <div className="flex flex-col gap-1 font-bold tracking-wider leading-tight">
            <div className="flex items-center gap-1.5 text-cyan-400 text-[14px]">
              <Globe size={14} className="text-cyan-400 animate-pulse" />
              <span>GS_LOC: {getLocationName(LAT, LON)}</span>
            </div>
            <div className="text-[12px] text-cyan-600/75 ml-[20px]">
              COORD: {LAT}° N, {LON}° E
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="tracking-widest">UPLINK_OK</span>
          </div>
        </div>

        <div className="p-3.5 flex items-center justify-between text-cyan-400 font-bold bg-cyan-500/5">
          <div className="flex flex-col gap-1.5 w-full font-mono text-[12.5px] leading-none justify-center">
            <div className="flex justify-between items-center">
              <span className="text-cyan-600/70 tracking-widest font-black">SYS_TIME:</span>
              <span className="text-cyan-400 font-black text-[14px]">{clocks.sysTime}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-cyan-600/70 tracking-widest font-black">LOC_TIME:</span>
              <span className="text-amber-500 font-black text-[14px] animate-pulse">{clocks.locTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CORE MASTER CONTROL LAYOUT MATRIX */}
      <main className="relative z-10 grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">
        
        {/* LEFT COMPASS DECK */}
        <section className="xl:col-span-1 flex flex-col gap-4">

          {/* [01] LIVE SKY STORY */}
          <div className="p-[1.5px] bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 clip-chamfer shadow-lg relative h-[300px]">
            <div className="clip-chamfer bg-black/12 backdrop-blur-sm p-4 flex flex-col h-full w-full relative">
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
              <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-2 text-cyan-400 font-black tracking-widest text-[16px]">
                <Radio size={14} className="animate-pulse" />
                <Tooltip text={TIPS.liveSkyStory}>
                  <span>[01] LIVE SKY STORY</span>
                </Tooltip>
              </div>
              <div className="flex-1 bg-black/8 border border-cyan-900/40 p-3.5 font-mono text-[16px] leading-relaxed text-cyan-300/80 overflow-y-auto custom-scrollbar">
                {loading && !telemetry ? (
                  <div className="text-cyan-600 animate-pulse">Synchronizing terminal matrix arrays...</div>
                ) : (
                  <p className="border-l border-cyan-500 pl-2 italic">
                    "{telemetry?.live_sky_story}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* [02] ZENITH SNAPSHOT */}
          <div className="p-[1.5px] bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 clip-chamfer shadow-lg relative">
            <div className="clip-chamfer bg-black/12 backdrop-blur-sm p-4 flex flex-col h-full w-full">
              <div className="text-cyan-400 font-black tracking-widest text-[16px] border-b border-cyan-500/20 pb-2 mb-2 flex justify-between items-center">
                <Tooltip text={TIPS.zenithSnapshot}>
                  <span>[02] ZENITH SNAPSHOT</span>
                </Tooltip>
                {activeTransits.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-950/80 border border-rose-500 text-rose-400 animate-pulse font-black rounded-sm">
                    PASS ACTIVE: {activeTransits[0].name.replace(" (ZARYA)", "").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-[13.5px] font-mono tracking-wider text-gray-400">
                <div className="text-cyan-300 font-bold">VISIBLE TARGETS:</div>
                <div className="text-right font-black text-cyan-400">{visibleSats.length} ACTIVE</div>
                <div className="text-cyan-300 font-bold">CLOSEST CONTACT:</div>
                <div className="text-right font-black text-gray-200 truncate">{closestSat ? closestSat.name : "NONE IN SECTOR"}</div>
                <div className="text-cyan-300 font-bold">RANGE TO TARGET:</div>
                <div className="text-right font-black text-gray-200">{closestSat ? `${Math.round(closestSat.range_km).toLocaleString()} KM` : "N/A"}</div>
                <div className="text-cyan-300 font-bold">TRACKING VECTOR:</div>
                <div className="text-right font-black text-amber-500">{closestSat ? `${closestSat.azimuth.toFixed(1)}° AZ / ${closestSat.elevation.toFixed(1)}° EL` : "N/A"}</div>
              </div>
              <LiveSignalWaveform />
            </div>
          </div>

          {/* [03] SATELLITE TRACKER */}
          <div className="p-[1.5px] bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 clip-chamfer shadow-lg relative flex flex-col h-fit">
            <div className="clip-chamfer bg-black/12 backdrop-blur-sm p-4 flex flex-col w-full h-fit">
              <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-2 text-cyan-400 font-black tracking-widest text-[16px]">
                <Orbit size={14} className="text-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
                <Tooltip text={TIPS.satelliteTracker}>
                  <span>[03] SATELLITE TRACKER</span>
                </Tooltip>
              </div>
              <div className="bg-black/40 border border-cyan-900/20 p-2 rounded-sm h-[650px] flex flex-col">
                <SatelliteCylinder3D
                  telemetry={telemetry}
                  loading={loading}
                  selectedSatId={selectedSatId}
                  onSelectSatellite={setSelectedSatId}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CENTER DECK */}
        <section className="xl:col-span-2 flex flex-col gap-4">
          <div className="p-[1.5px] bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 clip-chamfer shadow-2xl relative h-fit flex flex-col">
            <div className="clip-chamfer bg-black/5 backdrop-blur-sm p-4 flex flex-col h-fit w-full relative">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-black tracking-widest text-[16px]">
                  <Compass size={16} />
                  <Tooltip text={TIPS.overheadRadar}>
                    <span>{projectionMode === 'FULL' ? '[04] ZENITH_RADAR_SPHERE' : '[04] OVERHEAD RADAR'}</span>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-black/40 border border-cyan-800/40 p-0.5 rounded-sm select-none">
                    <button
                      onClick={() => setProjectionMode('HALF')}
                      className={`px-2.5 py-1 text-[12px] font-bold font-mono tracking-wider rounded-sm transition-all duration-150 border cursor-pointer uppercase ${
                        projectionMode === 'HALF'
                          ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-black'
                          : 'bg-transparent border-transparent text-cyan-700 hover:text-cyan-500 hover:bg-cyan-950/10'
                      }`}
                    >
                      HALF DOME
                    </button>
                    <button
                      onClick={() => setProjectionMode('FULL')}
                      className={`px-2.5 py-1 text-[12px] font-bold font-mono tracking-wider rounded-sm transition-all duration-150 border cursor-pointer uppercase ${
                        projectionMode === 'FULL'
                          ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-black'
                          : 'bg-transparent border-transparent text-cyan-700 hover:text-cyan-500 hover:bg-cyan-950/10'
                      }`}
                    >
                      FULL SPHERE
                    </button>
                  </div>
                  <span className="text-[12px] bg-cyan-950/80 border border-cyan-800 text-cyan-400 px-2.5 py-1 tracking-widest uppercase font-black rounded-sm">
                    Grid Layer 3D Active
                  </span>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center p-4 relative min-h-[700px]">
                <OrbitalDome3D
                  telemetry={telemetry}
                  loading={loading}
                  timeOffset={timeOffset}
                  projectionMode={projectionMode}
                  selectedSatId={selectedSatId}
                  onSelectSatellite={setSelectedSatId}
                />
              </div>

              {/* [05] TIME MACHINE */}
              <div className="border-t border-cyan-500/20 pt-3 mt-2">
                <div className="flex justify-between items-center text-[16px] mb-2">
                  <span className="text-cyan-400 flex items-center gap-2 tracking-widest font-black">
                    <Clock size={16} />
                    <Tooltip text={TIPS.timeMachine}>
                      <span>[05] TIME MACHINE</span>
                    </Tooltip>
                  </span>
                  <span className="font-bold font-mono px-2.5 py-1 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-sm text-[13px]">
                    {timeOffset === 0 ? "LIVE_SYNCHRONOUS" : `T_OFFSET: ${timeOffset > 0 ? '+' : ''}${timeOffset}H`}
                  </span>
                </div>
                <div className="relative w-full h-8 flex items-center mt-2 mb-2">
                  <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none">
                    <svg viewBox="0 0 400 30" className="w-full h-full text-cyan-400 fill-none stroke-current stroke-[1.5]">
                      <path d="M 0 15 Q 100 15 150 15 T 190 15 Q 200 2 210 15 T 220 15 Q 230 28 240 15 T 250 15 T 300 15 T 400 15" />
                      <path d="M 0 15 Q 80 15 140 15 T 180 15 Q 200 5 210 15 T 220 25 T 230 15 Q 250 5 260 15 T 320 15 T 400 15" className="opacity-75" strokeDasharray="3 3" />
                      <path d="M 0 15 Q 100 15 150 15 T 190 15 Q 200 28 210 15 T 220 15 Q 230 2 240 15 T 250 15 T 300 15 T 400 15" className="opacity-70" />
                    </svg>
                  </div>
                  <input
                    type="range"
                    min="-24"
                    max="24"
                    step="0.5"
                    value={timeOffset}
                    onChange={(e) => setTimeOffset(parseFloat(e.target.value))}
                    className="w-full h-[10px] bg-cyan-950/70 border border-cyan-500/30 rounded-sm appearance-none cursor-pointer relative z-10 focus:outline-none custom-range-slider"
                  />
                </div>
                <div className="flex justify-between text-[13px] font-mono mt-2 px-0.5 font-bold">
                  <span className="bg-black/50 text-cyan-400 px-2.5 py-1 rounded-sm border border-cyan-500/15">PROJECTION_PAST_24H</span>
                  <span className="bg-black/50 text-cyan-400 px-2.5 py-1 rounded-sm border border-cyan-500/15">SYSTEM_CLOCK_ZERO</span>
                  <span className="bg-black/50 text-cyan-400 px-2.5 py-1 rounded-sm border border-cyan-500/15">PROJECTION_FUTURE_24H</span>
                </div>
              </div>
            </div>
          </div>

          {/* TARGET INTELLIGENCE PROFILE */}
          <div className="p-[1.5px] bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 clip-chamfer shadow-lg relative mt-4">
            <div className="clip-chamfer bg-black/60 backdrop-blur-md p-6 flex flex-col w-full min-h-[340px]">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4.5 text-cyan-400 font-black tracking-widest text-[17px]">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="animate-pulse text-amber-500" />
                  <span>[05-B] TARGET_INTELLIGENCE_PROFILE</span>
                </div>
                <span className="text-[13.5px] text-cyan-600/80 font-black">DEEP_SPACE_INTEL</span>
              </div>

              {activeSat ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
                  <div className="md:col-span-2 flex flex-col items-center justify-between bg-black/45 border border-cyan-900/40 p-3 rounded-sm relative overflow-hidden min-h-[215px] h-full select-none">
                    <div className="absolute inset-0 bg-scanlines opacity-15 pointer-events-none"></div>
                    <div className="w-full flex-1 relative min-h-0">
                      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
                        <ambientLight intensity={1.5} />
                        <SatelliteHologram
                          name={activeSat.name}
                          color={isCurrentlyPassing ? (activeSat.name.toUpperCase().includes('ISS') ? '#f97316' : '#22d3ee') : '#fbbf24'}
                        />
                      </Canvas>
                      <div className="absolute inset-0 border border-cyan-500/10 rounded-full scale-[0.8] pointer-events-none flex items-center justify-center">
                        <div className="w-2/3 h-2/3 border border-dashed border-cyan-500/5 rounded-full"></div>
                      </div>
                    </div>
                    <div className="w-full flex flex-col items-center gap-1 border-t border-cyan-950/40 pt-1.5 relative z-10 shrink-0">
                      <span className="text-[10.5px] text-cyan-500/80 font-black tracking-widest uppercase leading-none">
                        {activeSat.name.toUpperCase().includes("ISS") ? "ORBITAL_HABITAT" : activeSat.name.toUpperCase().includes("R/B") ? "SPACE_DEBRIS" : activeSat.name.toUpperCase().includes("STARLINK") ? "COMMS_ARRAY" : "LEO_PAYLOAD"}
                      </span>
                      <span className={`text-[13px] font-black tracking-widest uppercase text-center max-w-full px-1.5 ${
                        isCurrentlyPassing ? 'text-emerald-400 animate-pulse' : 'text-amber-500'
                      }`}>
                        {isCurrentlyPassing ? 'TRACKING_LOCK' : 'SEARCHING...'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-3 flex flex-col justify-between space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-cyan-950 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[27px] font-black text-white tracking-wider leading-none uppercase">{activeSat.name}</span>
                        <span className="text-[14px] text-cyan-500 font-bold tracking-widest mt-2">NORAD_ID: {activeSat.id}</span>
                      </div>
                      <span className={`px-3 py-1.5 text-[13px] font-black rounded-sm border ${
                        isCurrentlyPassing
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 animate-pulse'
                          : 'bg-slate-950/80 text-slate-500 border-slate-800'
                      }`}>
                        {isCurrentlyPassing ? 'PASSING OVERHEAD' : 'BELOW HORIZON'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 text-[15.5px]">
                      <div className="flex flex-col">
                        <span className="text-cyan-400 font-black tracking-widest text-[11.5px]">ORIGIN / OPERATOR</span>
                        <span className="text-gray-100 font-black uppercase mt-0.5 leading-tight">{satInfo?.origin}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-cyan-400 tracking-widest font-black text-[11.5px]">MISSION / TYPE</span>
                        <span className="text-gray-100 font-black uppercase mt-0.5 leading-tight">{satInfo?.purpose}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-cyan-400 tracking-widest font-black text-[11.5px]">INTELLIGENCE REPORT</span>
                        <p className="text-cyan-50/95 leading-relaxed text-[15px] font-medium mt-1">{satInfo?.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-[17px] font-mono font-bold text-cyan-600/70">
                  NO ACTIVE SATELLITE TELEMETRY LINKED
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT DECK */}
        <section className="xl:col-span-1 flex flex-col gap-4">
          <div className="p-[1.5px] bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 clip-chamfer shadow-lg relative h-full flex flex-col">
            <div className="clip-chamfer bg-black/12 backdrop-blur-sm p-3 shadow-lg flex flex-col h-full w-full">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3 text-cyan-400 font-black tracking-widest text-[16px]">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="animate-pulse" />
                  <Tooltip text={TIPS.distancePhase}>
                    <span>[06] DISTANCE &amp; PHASE</span>
                  </Tooltip>
                </div>
                <span className="text-[9px] text-cyan-600/60 font-black">VECTOR_SORT</span>
              </div>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 max-h-[560px] custom-scrollbar">
                {telemetry?.cosmic_objects
                  ?.filter(obj => !obj.name.includes("ISS") && !obj.name.includes("STARLINK"))
                  ?.sort((a, b) => a.distance_km - b.distance_km)
                  ?.map((obj) => {
                    const isOverhead = obj.is_visible;
                    let planetColor = "#22d3ee";
                    if (obj.name === "Moon") planetColor = "#fcd34d";
                    if (obj.name === "Sun") planetColor = "#f97316";
                    if (obj.name === "Mars") planetColor = "#ef4444";
                    if (obj.name === "Jupiter") planetColor = "#e2e8f0";
                    if (obj.name === "Saturn") planetColor = "#fef08a";
                    if (obj.name === "Mercury") planetColor = "#94a3b8";
                    if (obj.name === "Uranus") planetColor = "#38bdf8";
                    if (obj.name === "Neptune") planetColor = "#6366f1";

                    return (
                      <div
                        key={obj.name}
                        className={`relative grid grid-cols-4 gap-4 p-3.5 border transition-all duration-300 bg-black/40 items-center h-[136px] ${
                          isOverhead
                            ? 'border-cyan-500/30 shadow-sm shadow-cyan-950/40 bg-gradient-to-r from-cyan-950/10 to-transparent'
                            : 'border-slate-900/60 opacity-25'
                        }`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <div className="h-[60px] w-[60px] relative bg-black border border-cyan-900/20 flex items-center justify-center overflow-hidden rounded-sm">
                            <div className="w-full h-full scale-100">
                              <OrbitalMiniRender color={planetColor} segments={4} isOverhead={isOverhead} name={obj.name} />
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3 flex flex-col justify-between h-full py-0.5">
                          <div className="flex justify-between items-center">
                            <span className={`text-[20px] font-black tracking-widest ${isOverhead ? 'text-gray-200' : 'text-slate-600'}`}>
                              {obj.name.toUpperCase()}
                            </span>
                            <span className={`text-[13px] px-2 py-0.5 font-black border ${
                              isOverhead
                                ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30'
                                : 'bg-black text-slate-700 border-slate-900'
                            }`}>
                              {isOverhead ? 'ACQ' : 'LOS'}
                            </span>
                          </div>
                          <div className="space-y-1 text-[14px] text-cyan-600/80 font-bold border-t border-cyan-950/40 pt-1.5 mt-1 flex flex-col">
                            <div className="flex justify-between">
                              <span>DST:</span>
                              <span className="text-gray-300 font-black">{Math.round(obj.distance_km).toLocaleString()} KM</span>
                            </div>
                            <div className="flex justify-between">
                              <span>ELV:</span>
                              <span className={`font-black ${obj.elevation >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{obj.elevation.toFixed(1)}°</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* [07] SUN & SHADOW */}
              <div className="mt-3 pt-3 border-t border-cyan-500/20">
                <div className="flex items-center justify-between text-cyan-400 text-[16px] font-black tracking-widest mb-2">
                  <Tooltip text={TIPS.sunShadow}>
                    <span>[07] SUN &amp; SHADOW</span>
                  </Tooltip>
                  <span className="text-[11.5px] px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20">SUN_CORE</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 items-center bg-black/60 p-4 border border-cyan-900/30 clip-chamfer">
                  <div className="col-span-2 space-y-2 text-[14px] font-bold text-cyan-600">
                    <div className="flex justify-between"><span>PHASE:</span><span className="text-gray-200 font-black uppercase">{sunPhaseText}</span></div>
                    <div className="flex justify-between"><span>ELEVATION:</span><span className="text-amber-500 font-black">{sunElevation >= 0 ? `${sunElevation.toFixed(2)}°` : "UNDER HORIZON"}</span></div>
                    <div className="flex justify-between"><span>SHADOW_RATIO:</span><span className="text-emerald-400 font-black">{shadowRatioText}</span></div>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-tr ${sunElevation > 0 ? 'from-amber-600 to-yellow-400 shadow-md shadow-amber-500/20 animate-pulse' : 'from-slate-800 to-slate-900 opacity-30'}`}></div>
                  </div>
                </div>
              </div>

              {/* [08] CONJUNCTION ALERTS */}
              <div className="mt-3 pt-3 border-t border-cyan-500/20 flex-1 flex flex-col min-h-[250px]">
                <div className="flex items-center justify-between text-cyan-400 text-[16px] font-black tracking-widest mb-2">
                  <Tooltip text={TIPS.conjunctionAlerts}>
                    <span>[08] CONJUNCTION ALERTS</span>
                  </Tooltip>
                  <span className="text-[13px] px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-500/20">LIVE_SCAN</span>
                </div>
                <div className="flex-1 bg-black/40 border border-cyan-950 p-4 clip-chamfer flex flex-col justify-center min-h-[180px]">
                  {telemetry?.conjunctions && telemetry.conjunctions.length > 0 ? (
                    <div className="space-y-2 overflow-y-auto max-h-[190px] custom-scrollbar">
                      {telemetry.conjunctions.map((threat, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-cyan-950/40 pb-1.5 text-[15px] font-mono">
                          <div className="flex flex-col">
                            <span className="text-gray-200 font-bold">{threat.satellite}</span>
                            <span className="text-cyan-600/80 text-[12px]">PROXIMITY ALIGN TO {threat.target.toUpperCase()}</span>
                          </div>
                          <div className="text-right flex items-center gap-1.5">
                            <span className="text-cyan-400 font-black">{threat.separation}° SEP</span>
                            <span className={`px-2 py-0.5 text-[12px] font-black rounded-sm border ${
                              threat.severity === 'CRITICAL'
                                ? 'bg-rose-950/60 text-rose-400 border-rose-500/30 animate-pulse'
                                : 'bg-amber-950/60 text-amber-500 border-amber-500/30'
                            }`}>
                              {threat.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 py-1">
                      <div className="grid grid-cols-3 gap-2 w-full px-1 text-[14px] font-mono text-cyan-500/80">
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 01:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 02:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 03:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 04:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 05:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 06:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 07:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 08:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                        <div className="border border-cyan-900/30 p-1.5 flex justify-between bg-black/20"><span>SEC 09:</span><span className="text-emerald-400 font-bold">NOMINAL</span></div>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-cyan-400 font-black tracking-widest text-[17px] animate-pulse">// RADAR SCANNING SECTORS 01-09</span>
                        <span className="text-emerald-400 font-bold text-[14.5px]">SYSTEM STATUS NOMINAL // NO ACTIVE PROXIMITY EVENTS</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>
    </div>
    </>
  );
}