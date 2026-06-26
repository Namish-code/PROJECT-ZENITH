import React, { useEffect, useRef } from 'react';

export default function CanvasPlayer({ onComplete, frames1, frames2, isReady }) {
  const canvasRef = useRef(null);
  const currentFrameIndex = useRef(0);
  const currentBatch = useRef(1); // 1 or 2
  const fps = 36; // 1.5x of 24 is 36 FPS for slightly faster HD playback
  const fpsInterval = 1000 / fps;
  const then = useRef(0);
  const requestRef = useRef();

  useEffect(() => {
    if (!isReady) return; // Wait until batch 1 is fully preloaded

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    const startPlayback = () => {
      then.current = performance.now();
      animate(then.current);
    };

    startPlayback();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isReady]);

  const drawFrame = (img) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');

    // Make canvas full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Re-apply HD settings on resize
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Center and scale image to cover
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    
    let drawWidth, drawHeight;
    let offsetX = 0, offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  const animate = (now) => {
    requestRef.current = requestAnimationFrame(animate);

    const elapsed = now - then.current;

    if (elapsed > fpsInterval) {
      then.current = now - (elapsed % fpsInterval);

      let img = null;

      if (currentBatch.current === 1) {
        if (currentFrameIndex.current < frames1.length) {
          img = frames1[currentFrameIndex.current];
          currentFrameIndex.current++;
        } else {
          // Switch to batch 2
          if (frames2 && frames2.length > 0) {
            currentBatch.current = 2;
            currentFrameIndex.current = 0;
            img = frames2[0];
            currentFrameIndex.current++;
          }
        }
      } else if (currentBatch.current === 2) {
        if (currentFrameIndex.current < frames2.length) {
          img = frames2[currentFrameIndex.current];
          currentFrameIndex.current++;
        } else {
          // Done
          cancelAnimationFrame(requestRef.current);
          onComplete();
          return;
        }
      }

      if (img && img.complete) {
        drawFrame(img);
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-black z-40 transform-gpu will-change-transform">
      {!isReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <span className="text-cyan-400 font-mono text-sm tracking-[0.3em] animate-pulse">
            LOADING CINEMATICS...
          </span>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full object-cover transform-gpu" style={{ imageRendering: 'high-quality' }} />
    </div>
  );
}
