import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import EffectPipeline from './EffectPipeline';

const MAX_ALTITUDE_KM = 400;
const CYLINDER_HEIGHT = 4;

function altitudeToY(altitudeKm) {
  const clamped = Math.max(0, Math.min(altitudeKm, MAX_ALTITUDE_KM));
  return -CYLINDER_HEIGHT / 2 + (clamped / MAX_ALTITUDE_KM) * CYLINDER_HEIGHT;
}

function satelliteColor(name) {
  if (name.toUpperCase().includes('ISS')) return '#f97316';
  if (name.toUpperCase().includes('STARLINK')) return '#22d3ee';
  return '#a78bfa';
}

function ScanningBeams() {
  const beamRef = useRef();

  useFrame(({ clock }) => {
    if (beamRef.current) {
      beamRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 2;
    }
  });

  return (
    <mesh ref={beamRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0, 1.18, 32]} />
      <meshBasicMaterial color="#06b6d4" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SatelliteVector({ altitudeKm, color, velocityKms, selected }) {
  const groupRef = useRef();
  const orbitSpeed = Math.max(0.15, Math.min(velocityKms * 0.05, 1.2));
  const yPos = altitudeToY(altitudeKm);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * orbitSpeed;
    }
  });

  const size = selected ? 0.14 : 0.08;
  const opacity = selected ? 1.0 : 0.6;
  const ringScale = selected ? 1.6 : 1.0;

  return (
    <group ref={groupRef} position={[0, yPos, 0]}>
      <group position={[1.2, 0, 0]}>
        <mesh>
          <boxGeometry args={[size, size, size]} />
          <meshBasicMaterial color={selected ? '#fbbf24' : color} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[ringScale, ringScale, 1]}>
          <ringGeometry args={[0.12, 0.15, 4]} />
          <meshBasicMaterial color={selected ? '#fbbf24' : color} transparent opacity={opacity} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function SatelliteScene({ satellites, selectedSatId }) {
  return (
    <>
      <ambientLight intensity={1} />

      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, CYLINDER_HEIGHT, 24, 6, true]} />
        <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.12} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CYLINDER_HEIGHT / 2, 0]}>
        <ringGeometry args={[1.18, 1.22, 48]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -CYLINDER_HEIGHT / 2, 0]}>
        <ringGeometry args={[1.18, 1.22, 48]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {satellites.map((sat) => (
        <SatelliteVector
          key={sat.id ?? sat.name}
          altitudeKm={sat.altitude_km}
          color={satelliteColor(sat.name)}
          velocityKms={sat.velocity_kms ?? 7.5}
          selected={selectedSatId === sat.id}
        />
      ))}

      <ScanningBeams />

      <OrbitControls
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.2}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}

export default function SatelliteCylinder3D({ telemetry, loading, selectedSatId, onSelectSatellite }) {
  const [activeTab, setActiveTab] = useState('visualizer');
  const satellites = telemetry?.satellites ?? [];

  return (
    <div className="w-full h-full min-h-0 bg-black/20 rounded-lg relative overflow-hidden flex flex-col">
      {/* Visualizer / Log Selector Tabs */}
      <div className="flex border-b border-cyan-500/15 bg-black/40 p-1 gap-1 select-none">
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`flex-1 py-1.5 px-3 text-[11px] font-bold font-mono tracking-wider rounded-sm transition-all duration-200 border uppercase cursor-pointer ${
            activeTab === 'visualizer'
              ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
              : 'bg-transparent border-transparent text-cyan-700 hover:text-cyan-500 hover:bg-cyan-950/20'
          }`}
        >
          [03-A] // 3D_CHAMBER
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-1.5 px-3 text-[11px] font-bold font-mono tracking-wider rounded-sm transition-all duration-200 border uppercase cursor-pointer ${
            activeTab === 'metrics'
              ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
              : 'bg-transparent border-transparent text-cyan-700 hover:text-cyan-500 hover:bg-cyan-950/20'
          }`}
        >
          [03-B] // TELEMETRY_LOG
        </button>
      </div>

      {/* Tab Panel Viewports */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {activeTab === 'visualizer' ? (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="absolute left-4 top-4 bottom-4 flex flex-col justify-between text-[14px] font-mono text-cyan-600/70 pointer-events-none z-10 select-none">
              <span>400km [LEO]</span>
              <span>300km</span>
              <span>200km</span>
              <span>100km [KARMAN]</span>
              <span>0km [GROUND]</span>
            </div>

            {loading && !telemetry ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-mono text-cyan-600 animate-pulse z-20">
                Acquiring LEO telemetry uplink...
              </div>
            ) : (
              <Canvas camera={{ position: [0, 1.5, 4.2], fov: 60 }}>
                <SatelliteScene satellites={satellites} selectedSatId={selectedSatId} />
                <EffectPipeline />
              </Canvas>
            )}
          </div>
        ) : (
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto custom-scrollbar min-h-0">
            {satellites.length === 0 ? (
              <p className="text-[15px] font-mono text-cyan-600/70">No tracked satellites in feed.</p>
            ) : (
              satellites.map((sat) => {
                const isSelected = selectedSatId === sat.id;
                return (
                  <div
                    key={sat.id ?? sat.name}
                    onClick={() => onSelectSatellite && onSelectSatellite(sat.id)}
                    className={`flex flex-col border border-cyan-950/30 p-2.5 rounded transition-all duration-150 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/25'
                        : 'hover:bg-cyan-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[15px] font-mono font-bold">
                      <span className="text-gray-300" style={{ color: satelliteColor(sat.name) }}>
                        {sat.name}
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-[12px] uppercase border ${
                          sat.is_visible
                            ? 'text-green-400 border-green-800/60 bg-green-950/40'
                            : 'text-slate-500 border-slate-800 bg-slate-950/40'
                        }`}
                      >
                        {sat.is_visible ? 'ACQUIRED' : 'BELOW HORIZON'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13.5px] text-cyan-600/80 mt-1.5 font-mono">
                      <span>ALT: <span className="text-cyan-400 font-bold">{sat.altitude_km?.toFixed(1)} km</span></span>
                      <span>VEL: <span className="text-cyan-400 font-bold">{sat.velocity_kms?.toFixed(2)} km/s</span></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
