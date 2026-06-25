import React from 'react';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export default function EffectPipeline() {
  return (
    <EffectComposer disableNormalPass>
      {/* 1. The Real Neon Bloom Engine: Makes emissive colors radiate light */}
      <Bloom 
        intensity={1.5} 
        luminanceThreshold={0.15} 
        luminanceSmoothing={0.9} 
        blendFunction={BlendFunction.SCREEN} 
      />
      {/* 2. Chromatic Aberration: Simulates tactical glass lens fringe warping on edges */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0015, 0.0015]}
      />
      {/* 3. Vignette: Darkens the edge corners of your monitor to maximize contrast */}
      <Vignette
        eskil={false}
        offset={0.5}
        darkness={0.8}
      />
    </EffectComposer>
  );
}