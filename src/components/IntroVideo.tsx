import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface IntroVideoProps {
  compact?: boolean;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({ compact = false }) => {
  return (
    <div className={`relative bg-black/80 backdrop-blur-md ${compact ? 'border-2 border-boombox-gray/80 rounded-2xl' : 'border-2 md:border-4 border-boombox-gray/80 rounded-2xl md:rounded-[3rem]'} overflow-hidden shadow-2xl boombox-texture group`}>
      <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
        <img
          src="/assets/images/slide_arcade_hq_1787112020140.jpg"
          alt="Video thumbnail"
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/graffiti_wall_bg.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="p-4 rounded-full bg-brand-yellow text-black shadow-glow hover:scale-110 transition-transform cursor-pointer">
            <Play size={28} className="fill-current ml-0.5" />
          </div>
          <h4 className="mt-3 text-white font-black italic uppercase text-sm md:text-lg tracking-wider">
            RAPLIFE RECORDS REEL OFICIAL
          </h4>
          <p className="text-[10px] md:text-xs text-brand-yellow/80 font-mono font-bold uppercase mt-1">
            CONOCE NUESTRO MOVIMIENTO & PRODUCCIÓN
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntroVideo;
