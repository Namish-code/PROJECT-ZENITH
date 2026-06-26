import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ZenithTransition({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 600); // 600ms total duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
      {/* 
        The flash expands to 100vw. We hold opacity at 1 for the first 60% of the animation 
        so the bright light expansion is fully felt, then it fades to reveal the dashboard. 
      */}
      <motion.div
        initial={{ width: '2px', height: '100vh', opacity: 1 }}
        animate={{ width: '100vw', opacity: [1, 1, 0] }}
        transition={{ 
          duration: 0.6, 
          ease: [0.22, 1, 0.36, 1],
          opacity: { times: [0, 0.6, 1] }
        }}
        className="bg-white shadow-[0_0_50px_10px_rgba(6,182,212,1),0_0_100px_20px_rgba(255,255,255,0.8)]"
      />
    </div>
  );
}
