import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';

export default function TerminalInput({ onComplete, framesLoaded }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('AWAITING INPUT...');
  const [coords, setCoords] = useState(null); // { lat, lon, lng, name }
  const [globeData, setGlobeData] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [mapMode, setMapMode] = useState('TACTICAL'); // 'TACTICAL' | 'SATELLITE'
  const globeEl = useRef();

  // Handle Nominatim Geocoding API Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setStatus('QUERYING SATELLITE DATABASES...');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        const locData = { lat, lon, lng: lon, name: result.display_name };
        setCoords(locData);
        setGlobeData([locData]);
        setStatus(`LOCATION ACQUIRED: ${result.display_name.toUpperCase()}`);

        if (globeEl.current) {
          globeEl.current.pointOfView({ lat, lng: lon, altitude: 2 }, 1000);
        }
      } else {
        setStatus('ERROR: LOCATION NOT FOUND.');
        setCoords(null);
        setGlobeData([]);
      }
    } catch (err) {
      setStatus('ERROR: UPLINK FAILED.');
    }
  };

  // Handle "INITIALIZE RADAR" click
  const handleInitialize = async () => {
    if (!coords) return;
    setIsChecking(true);
    setStatus('ESTABLISHING TELEMETRY LINK...');

    try {
      // Connect to our telemetry backend to ensure it's up
      const res = await fetch(`/api/v1/zenith-telemetry?lat=${coords.lat}&lon=${coords.lon}`);
      if (!res.ok) throw new Error('Telemetry server error');
      
      setStatus('LINK ESTABLISHED. COMMENCING SPATIAL JUMP.');
      setIsExiting(true);
      
      setTimeout(() => {
        onComplete({ lat: coords.lat, lon: coords.lon, lng: coords.lng, name: coords.name });
      }, 1500);
      
    } catch (err) {
      setStatus('ERROR: BACKEND CONNECTION REFUSED.');
      setIsChecking(false);
    }
  };

  const globeUrl = mapMode === 'TACTICAL' 
    ? "//unpkg.com/three-globe/example/img/earth-dark.jpg"
    : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div 
          key="terminal"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ scale: 0, opacity: 0, y: -200 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div className="w-[800px] h-[500px] bg-[#03060b]/95 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-md flex flex-col overflow-hidden pointer-events-auto backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-cyan-500/30 bg-cyan-950/20">
              <span className="text-cyan-400 font-mono font-bold tracking-widest text-sm animate-pulse">
                SYS_NODE // UPLINK_TERMINAL
              </span>
              <div className="flex items-center gap-4">
                {/* Visual indicator for background image preload state */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${framesLoaded ? 'bg-emerald-400' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-[10px] font-mono text-cyan-500/70 tracking-widest">
                    {framesLoaded ? 'CINEMATICS LOADED' : 'BUFFERING CINEMATICS...'}
                  </span>
                </div>
                <span className="text-cyan-600 font-mono text-xs">V.2.0.4</span>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel - Input */}
              <div className="w-1/2 p-6 flex flex-col justify-center border-r border-cyan-500/20">
                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-cyan-500/70 font-mono text-[10px] tracking-widest uppercase font-bold">Target Location</label>
                    <input 
                      type="text" 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ENTER CITY / COORDS"
                      className="bg-black/50 border border-cyan-800 focus:border-cyan-400 outline-none p-3 text-cyan-300 font-mono text-sm tracking-wider uppercase transition-colors"
                      autoFocus
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-700 text-cyan-400 p-2 font-mono text-xs tracking-widest uppercase transition-all duration-200"
                  >
                    SEARCH COORDINATES
                  </button>
                </form>

                <div className="mt-8 flex flex-col gap-2">
                  <span className="text-cyan-600/70 font-mono text-[10px] tracking-widest uppercase font-bold">System Status</span>
                  <div className={`p-3 border font-mono text-xs tracking-wider leading-relaxed ${
                    status.includes('ERROR') ? 'bg-rose-950/20 border-rose-800 text-rose-400' : 
                    status.includes('ACQUIRED') ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' :
                    'bg-cyan-950/20 border-cyan-800/50 text-cyan-400/80'
                  }`}>
                    &gt; {status}
                  </div>
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={handleInitialize}
                    disabled={!coords || isChecking || !framesLoaded}
                    className={`w-full p-3 font-mono text-sm tracking-[0.2em] uppercase transition-all duration-300 border ${
                      !coords || isChecking || !framesLoaded
                        ? 'bg-black/40 border-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-cyan-500/10 hover:bg-cyan-400 hover:text-black border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {isChecking ? 'INITIALIZING...' : !framesLoaded ? 'AWAITING CINEMATICS...' : 'INITIALIZE RADAR'}
                  </button>
                </div>
              </div>

              {/* Right Panel - Globe */}
              <div className="w-1/2 relative bg-black/80 flex flex-col overflow-hidden">
                <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center border border-cyan-500/30 bg-black/60 p-1.5 backdrop-blur-sm">
                  <button 
                    onClick={() => setMapMode('TACTICAL')}
                    className={`flex-1 text-[10px] font-mono tracking-widest py-1 transition-colors ${mapMode === 'TACTICAL' ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/50' : 'text-cyan-600 hover:text-cyan-400'}`}
                  >
                    TACTICAL
                  </button>
                  <button 
                    onClick={() => setMapMode('SATELLITE')}
                    className={`flex-1 text-[10px] font-mono tracking-widest py-1 transition-colors ${mapMode === 'SATELLITE' ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/50' : 'text-cyan-600 hover:text-cyan-400'}`}
                  >
                    SATELLITE
                  </button>
                </div>

                <div className="flex-1 relative flex items-center justify-center pointer-events-auto">
                  <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <Globe
                      ref={globeEl}
                      width={400}
                      height={400}
                      globeImageUrl={globeUrl}
                      backgroundColor="rgba(0,0,0,0)"
                      pointsData={globeData}
                      pointLat="lat"
                      pointLng="lng"
                      pointColor={() => '#06b6d4'}
                      pointAltitude={0.1}
                      pointRadius={0.5}
                      pointsMerge={true}
                    />
                  </div>
                  {/* Overlay Vignette */}
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(3,6,11,1)] z-10" />
                </div>
                
                {coords && (
                  <div className="absolute bottom-4 left-4 right-4 z-20 bg-black/60 border border-cyan-500/30 p-2 backdrop-blur-sm pointer-events-none">
                    <div className="flex flex-col gap-1 text-cyan-400 font-mono text-[10px] tracking-widest uppercase font-bold">
                      <div className="flex justify-between"><span>LAT:</span> <span className="text-emerald-400">{coords.lat.toFixed(4)}°</span></div>
                      <div className="flex justify-between"><span>LON:</span> <span className="text-emerald-400">{coords.lon.toFixed(4)}°</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
