import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import EffectPipeline from './EffectPipeline';

const TEXTURES = {
  Moon: 'https://unpkg.com/three-textures@1.2.0/textures/moon.jpg',
  Mars: 'https://unpkg.com/three-textures@1.2.0/textures/mars.jpg',
  Jupiter: 'https://unpkg.com/three-textures@1.2.0/textures/jupiter.jpg',
  Venus: 'https://unpkg.com/three-textures@1.2.0/textures/venus_atmosphere.jpg'
};

// Mock star coordinates to draw tactical constellation lines (Ursa Major style)
const CONSTELLATION_POINTS = [
  new THREE.Vector3(-1.2, 1.8, -1.0),
  new THREE.Vector3(-0.8, 2.0, -0.6),
  new THREE.Vector3(-0.4, 2.1, -0.7),
  new THREE.Vector3(0.0, 2.2, -0.4),
  new THREE.Vector3(0.2, 1.9, 0.2),
  new THREE.Vector3(0.8, 1.7, 0.4),
  new THREE.Vector3(0.7, 1.4, -0.1),
  new THREE.Vector3(0.2, 1.9, 0.2) // Loop back
];

function ConstellationLines() {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(CONSTELLATION_POINTS);
  return (
    <group>
      {/* Draw the vector lines linking the stars */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#06b6d4" transparent opacity={0.25} linewidth={1} />
      </line>
      {/* Draw small glowing nodes at each constellation star vertex */}
      {CONSTELLATION_POINTS.map((pt, idx) => (
        <mesh key={idx} position={pt}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#a5f3fc" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Renders the dotted orbital paths on the dome
function SatellitePath({ pathPoints, color, isHovered, isDashed, projectionMode }) {
  if (!pathPoints || pathPoints.length < 2) return null;

  // Filter out below-horizon segments in Half Dome mode
  const activePoints = projectionMode === 'HALF'
    ? pathPoints.filter(pt => pt.elevation >= 0)
    : pathPoints;

  if (activePoints.length < 2) return null;

  const points = activePoints.map(pt => {
    const phi = (90 - pt.elevation) * (Math.PI / 180);
    const theta = (pt.azimuth) * (Math.PI / 180);
    const radius = 2.5;

    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = -radius * Math.sin(phi) * Math.cos(theta);
    return new THREE.Vector3(x, y, z);
  });

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  if (isDashed) {
    return (
      <line geometry={lineGeometry} onUpdate={(line) => line.computeLineDistances()}>
        <lineDashedMaterial 
          color={color} 
          transparent 
          opacity={isHovered ? 0.8 : 0.25} 
          dashSize={0.12} 
          gapSize={0.06} 
        />
      </line>
    );
  }

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={isHovered ? 0.9 : 0.3} 
        linewidth={isHovered ? 2.5 : 1}
      />
    </line>
  );
}

function RealisticCelestialBody({ obj, projectionMode, isSelected, onSelect }) {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  const phi = (90 - obj.elevation) * (Math.PI / 180);
  const theta = (obj.azimuth) * (Math.PI / 180);
  const radius = 2.5;

  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = -radius * Math.sin(phi) * Math.cos(theta);

  useEffect(() => {
    if (obj.name === 'Sun' || obj.name.includes('ISS') || obj.name.includes('STARLINK') || !TEXTURES[obj.name]) return;
    const loader = new THREE.TextureLoader();
    loader.load(TEXTURES[obj.name], (t) => setTexture(t), undefined, () => setTexture(null));
  }, [obj.name]);

  useFrame(({ clock }) => {
    if (meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 0.2;
  });

  const isSatellite = !["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"].includes(obj.name);
  const hasPath = !!obj.path_points && obj.path_points.length > 0;
  const isCosmicPath = hasPath && (obj.name === "Sun" || obj.name === "Moon");
  
  // Ghost below-horizon targets in Full Sphere mode
  const opacity = (projectionMode === 'FULL' && !obj.is_visible) ? 0.3 : 1.0;

  let fallbackColor = "#22d3ee";
  if (obj.name === "Moon") fallbackColor = "#fef08a";
  if (obj.name === "Sun") fallbackColor = "#ea580c";
  if (obj.name === "Mars") fallbackColor = "#f87171";
  if (obj.name === "Jupiter") fallbackColor = "#fed7aa";
  if (obj.name.includes("ISS")) fallbackColor = "#f97316";

  if (projectionMode === 'HALF' && !obj.is_visible) {
    return null;
  }

  return (
    <group>
      {/* 1. Trajectory path lines */}
      {hasPath && (
        <SatellitePath 
          pathPoints={obj.path_points} 
          color={fallbackColor} 
          isHovered={isHovered} 
          isDashed={isCosmicPath} 
          projectionMode={projectionMode}
        />
      )}

      {/* 2. Hoverable 3D Mesh node */}
      <group 
        position={[x, y, z]}
        onPointerOver={(e) => {
          if (isSatellite) {
            e.stopPropagation();
            setIsHovered(true);
          }
        }}
        onPointerOut={(e) => {
          if (isSatellite) {
            setIsHovered(false);
          }
        }}
        onClick={(e) => {
          if (isSatellite) {
            e.stopPropagation();
            if (onSelect) onSelect(obj.id);
          }
        }}
      >
        <mesh ref={meshRef}>
          {isSatellite ? (
            <boxGeometry args={[isSelected ? 0.16 : 0.12, isSelected ? 0.16 : 0.12, isSelected ? 0.16 : 0.12]} />
          ) : (
            <sphereGeometry args={[0.14, 32, 32]} />
          )}
          
          {obj.name === 'Sun' ? (
            <meshBasicMaterial color={fallbackColor} transparent opacity={opacity} />
          ) : texture && !isSatellite ? (
            <meshStandardMaterial map={texture} roughness={0.7} metalness={0.1} transparent opacity={opacity} />
          ) : (
            <meshStandardMaterial 
              color={isSelected ? "#f59e0b" : fallbackColor} 
              roughness={0.4} 
              metalness={0.3} 
              emissive={isSelected ? "#f59e0b" : fallbackColor} 
              emissiveIntensity={isSatellite ? (isSelected ? 2.5 * opacity : isHovered ? 1.8 * opacity : 0.8 * opacity) : 0.2 * opacity} 
              transparent
              opacity={opacity}
            />
          )}
        </mesh>
        
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[isSelected ? 0.22 : 0.18, isSelected ? 0.27 : 0.21, isSatellite ? 4 : 32]} />
          <meshBasicMaterial 
            color={isSelected ? "#f59e0b" : fallbackColor} 
            transparent 
            opacity={isSatellite ? (isSelected ? 1.0 * opacity : isHovered ? 0.9 * opacity : 0.4 * opacity) : 0.4 * opacity} 
            side={THREE.DoubleSide} 
          />
        </mesh>

        {/* 3. Persistent name labels & Hover Diagnostic Cards */}
        {isSatellite && (isHovered || obj.name.toUpperCase().includes("ISS") || obj.name.toUpperCase().includes("TIANGONG") || obj.name.toUpperCase().includes("CSS")) && (
          <Html distanceFactor={8} position={[0, 0.2, 0]} pointerEvents="none">
            <div className="flex flex-col items-center font-mono select-none">
              <div 
                className="px-2 py-1 text-[11px] font-black tracking-widest bg-black/80 border rounded-sm whitespace-nowrap"
                style={{ borderColor: fallbackColor, color: fallbackColor }}
              >
                {obj.name.toUpperCase()}
              </div>

              {isHovered && (
                <div 
                  className="mt-1.5 p-2 bg-[#060a12]/95 border text-[10px] leading-tight space-y-1 rounded-sm shadow-lg shadow-black w-32 text-gray-300"
                  style={{ borderColor: fallbackColor }}
                >
                  <div className="font-black text-white border-b border-cyan-500/20 pb-0.5 mb-1 text-[11px]">TELEMETRY LOCK</div>
                  <div>ALT: <span className="text-white font-bold">{Math.round(obj.altitude_km)}KM</span></div>
                  <div>VEL: <span className="text-white font-bold">{obj.velocity_kms.toFixed(2)}KMS</span></div>
                  <div>RNG: <span className="text-white font-bold">{Math.round(obj.distance_km)}KM</span></div>
                  <div>ELV: <span className="text-white font-bold">{obj.elevation.toFixed(1)}°</span></div>
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function PulsingRadarRings() {
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    // Two rings pulsing at different rates/phases
    if (ringRef1.current) {
      const cycle1 = (elapsed * 0.5) % 1; // slow pulse
      ringRef1.current.scale.set(cycle1 * 2.2, cycle1 * 2.2, 1);
      ringRef1.current.material.opacity = (1 - cycle1) * 0.4;
    }
    if (ringRef2.current) {
      const cycle2 = (elapsed * 0.5 + 0.5) % 1; // offset by 0.5 cycle
      ringRef2.current.scale.set(cycle2 * 2.2, cycle2 * 2.2, 1);
      ringRef2.current.material.opacity = (1 - cycle2) * 0.4;
    }
  });

  return (
    <group position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef1}>
        <ringGeometry args={[0.98, 1.0, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef2}>
        <ringGeometry args={[0.98, 1.0, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function OrbitalDome3D({ telemetry, loading, timeOffset, projectionMode, selectedSatId, onSelectSatellite }) {
  // Combine planets and satellites into one master loop for the dome scene
  const allObjects = [
    ...(telemetry?.cosmic_objects || []),
    ...(telemetry?.satellites || [])
  ];

  return (
    <div className="h-full aspect-square mx-auto bg-[#040712]/90 rounded-full border border-cyan-500/20 shadow-2xl relative overflow-hidden">
      
      {/* Crosshair Overlay HUD */}
      <div className="absolute inset-0 pointer-events-none z-10 p-4 flex items-center justify-center">
        <div className="h-full aspect-square border border-cyan-500/10 rounded-full p-4 flex items-center justify-center max-w-full">
          <div className="w-full h-full border border-dashed border-cyan-500/5 rounded-full flex items-center justify-center relative">
            <div className="absolute top-0 bottom-0 w-px bg-cyan-500/10"></div>
            <div className="absolute left-0 right-0 h-px bg-cyan-500/10"></div>
            <span className="absolute top-2 text-[8px] text-cyan-600/60 font-mono tracking-widest">N 0°</span>
            <span className="absolute right-2 text-[8px] text-cyan-600/60 font-mono tracking-widest">E 90°</span>
          </div>
        </div>
      </div>

      <Canvas camera={{ position: [0, 2.8, 3.8], fov: 60 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} />
        
        <Stars radius={100} depth={50} count={500} factor={4} saturation={0.5} fade speed={0.2} />

        {/* Master Radar Cage Grid */}
        <mesh>
          <sphereGeometry args={[2.5, 40, 20, 0, Math.PI * 2, 0, projectionMode === 'FULL' ? Math.PI : Math.PI / 2]} />
          <meshBasicMaterial color="#0891b2" wireframe transparent opacity={projectionMode === 'FULL' ? 0.05 : 0.1} />
        </mesh>

        {/* Render Combined Aerospace Targets (Planets + Human Hardware) */}
        {!loading && allObjects.map((obj) => {
          const shouldRender = projectionMode === 'FULL' || obj.is_visible;
          return shouldRender && (
            <RealisticCelestialBody 
              key={`${obj.id ?? obj.name}-${timeOffset}`} 
              obj={obj} 
              projectionMode={projectionMode} 
              isSelected={selectedSatId === obj.id}
              onSelect={onSelectSatellite}
            />
          );
        })}

        {/* Noida Base Tracker Station Dot */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>

        {/* Pulsing Sonar Range Rings */}
        <PulsingRadarRings />

        {/* Horizon Line Grid & Ring Helpers for Full Sphere mode */}
        {projectionMode === 'FULL' && (
          <group>
            {/* Horizon ring outline */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <ringGeometry args={[2.48, 2.52, 64]} />
              <meshBasicMaterial color="#0891b2" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
            {/* Horizon horizontal crossgrid plane */}
            <gridHelper args={[5.0, 10, '#0891b2', '#0891b2']} position={[0, 0, 0]} opacity={0.03} transparent />
          </group>
        )}

        <OrbitControls 
          enableZoom={true} 
          maxDistance={5} 
          minDistance={1.8}
          maxPolarAngle={projectionMode === 'FULL' ? Math.PI : Math.PI / 2 - 0.02} 
        />
        <EffectPipeline />
      </Canvas>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-cyan-800 text-[10px] px-3 py-1 rounded-full font-mono text-cyan-400 tracking-widest pointer-events-none z-10 select-none uppercase shadow-lg">
        {projectionMode === 'FULL' ? 'FULL SPHERE SCANNING ACTIVE' : 'COMBINED RADAR LAYER ACTIVE'}
      </div>
    </div>
  );
}