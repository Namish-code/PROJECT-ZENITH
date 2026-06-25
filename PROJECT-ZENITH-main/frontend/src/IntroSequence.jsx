import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TerminalInput from './TerminalInput';
import CanvasPlayer from './CanvasPlayer';
import ZenithTransition from './ZenithTransition';

export default function IntroSequence({ onIntroComplete, onCoordinatesSet }) {
  const [phase, setPhase] = useState(1); // 1: Terminal, 2: Canvas, 3: Wipe
  const [targetCoords, setTargetCoords] = useState(null);

  // Preloading State
  const [framesLoaded, setFramesLoaded] = useState(false);
  const frames1 = useRef([]);
  const frames2 = useRef([]);

  useEffect(() => {
    let mounted = true;
    const pad = (num) => num.toString().padStart(3, '0');

    const preloadImages = async () => {
      // Load Batch 1
      const p1 = [];
      for (let i = 1; i <= 290; i++) {
        const img = new Image();
        img.src = `/1/ezgif-frame-${pad(i)}.jpg`;
        const promise = new Promise((resolve) => {
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
        });
        p1.push(promise);
      }

      const loaded1 = await Promise.all(p1);
      if (!mounted) return;
      frames1.current = loaded1;
      setFramesLoaded(true); // Batch 1 is ready, we can start Phase 2 instantly when triggered

      // Load Batch 2 in background
      const p2 = [];
      for (let i = 1; i <= 173; i++) {
        const img = new Image();
        img.src = `/2/ezgif-frame-${pad(i)}.jpg`;
        const promise = new Promise((resolve) => {
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
        });
        p2.push(promise);
      }

      const loaded2 = await Promise.all(p2);
      if (!mounted) return;
      frames2.current = loaded2;
    };

    preloadImages();
    return () => { mounted = false; };
  }, []);

  const handleTerminalComplete = (coords) => {
    setTargetCoords(coords);
    onCoordinatesSet(coords);
    setPhase(2);
  };

  const handleCanvasComplete = () => {
    setPhase(3);
  };

  const handleTransitionComplete = () => {
    onIntroComplete();
  };

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          key="intro-container"
          // We don't fade out the container anymore. 
          // Phase 3 acts as a window to the dashboard underneath.
          className={`fixed inset-0 z-50 overflow-hidden select-none ${phase < 3 ? 'bg-black' : ''}`}
        >
          {/* Phase 1 Static Background */}
          {phase === 1 && (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
              style={{ backgroundImage: 'url(/1/ezgif-frame-001.jpg)' }}
            />
          )}

          {/* Phase 1: Uplink Terminal */}
          {phase === 1 && <TerminalInput onComplete={handleTerminalComplete} framesLoaded={framesLoaded} />}

          {/* Phase 2: Canvas Player */}
          {phase === 2 && (
            <CanvasPlayer 
              onComplete={handleCanvasComplete} 
              frames1={frames1.current} 
              frames2={frames2.current} 
              isReady={framesLoaded} 
            />
          )}

          {/* Phase 3: White Wipe Transition */}
          {phase === 3 && <ZenithTransition onComplete={handleTransitionComplete} />}

          {/* Persistent Black Telemetry HUD (Bottom Right) - Only during Phase 1 and 2 */}
          {phase < 3 && (
            <div className="absolute bottom-0 right-0 w-80 h-48 bg-[#03060b] z-[55] border-t border-l border-cyan-900/50 p-4 flex flex-col justify-end shadow-[-10px_-10px_30px_rgba(0,0,0,0.8)]">
              <div className="flex flex-col gap-2 font-mono tracking-widest uppercase">
                <span className="text-cyan-600 text-[10px] font-black border-b border-cyan-900/40 pb-1 mb-1">
                  TARGET TELEMETRY OVERRIDE
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-500/60">LAT:</span>
                  <span className={targetCoords ? 'text-cyan-400 font-bold' : 'text-amber-500 animate-pulse'}>
                    {targetCoords ? `${targetCoords.lat.toFixed(4)}°` : 'ACQUIRING...'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-500/60">LON:</span>
                  <span className={targetCoords ? 'text-cyan-400 font-bold' : 'text-amber-500 animate-pulse'}>
                    {targetCoords ? `${targetCoords.lon.toFixed(4)}°` : 'ACQUIRING...'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-2 pt-2 border-t border-cyan-900/40">
                  <span className="text-cyan-500/40">SYS_STATUS:</span>
                  <span className={phase >= 2 ? 'text-emerald-400 font-bold' : 'text-amber-500'}>
                    {phase >= 2 ? 'LOCKED & SYNCED' : 'AWAITING INPUT'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
