import React, { useState } from 'react';
import { Disc, Play, Pause, Volume2, Mic, Sparkles, ExternalLink } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export const SpotifyTurntable: React.FC = () => {
  const { currentTrack, isPlaying, togglePlay } = useMusic();
  const [scratchAngle, setScratchAngle] = useState(0);

  return (
    <div className="bg-neutral-950/75 backdrop-blur-md border-4 border-boombox-gray/80 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-2xl boombox-texture max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        
        {/* VINYL TURNTABLE DECK */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-64 h-64 md:w-80 md:h-80 bg-neutral-900 rounded-full border-8 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
            {/* Spinning Vinyl Record */}
            <div 
              className={`w-[90%] h-[90%] rounded-full bg-black border-4 border-neutral-800 relative flex items-center justify-center transition-transform ${
                isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
              }`}
              style={{
                backgroundImage: 'repeating-radial-gradient(circle, #111 0, #111 2px, #000 3px, #000 4px)'
              }}
            >
              {/* Vinyl Center Label */}
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-brand-yellow border-4 border-black flex flex-col items-center justify-center p-2 text-center shadow-inner relative z-10">
                <span className="text-[8px] font-black text-black font-mono tracking-widest uppercase">RAPLIFE</span>
                <Disc size={20} className="text-black my-1 animate-pulse" />
                <span className="text-[7px] font-bold text-black/80 truncate max-w-[80px]">
                  {currentTrack?.title || 'VINILO DIGITAL'}
                </span>
                {/* Spindle hole */}
                <div className="w-3 h-3 rounded-full bg-black border border-white/40 absolute inset-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Tonearm overlay */}
            <div className={`absolute top-4 right-4 w-4 h-32 md:h-40 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full origin-top transform transition-transform duration-500 shadow-xl ${
              isPlaying ? 'rotate-20' : 'rotate-0'
            }`} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="px-6 py-2.5 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-black font-black uppercase text-xs shadow-glow hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
              <span>{isPlaying ? 'PAUSAR TORNAMESA' : 'ACTIVAR VINILO'}</span>
            </button>
          </div>
        </div>

        {/* TRACK INFO & DIGITAL DISPLAY */}
        <div className="flex-1 space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-xs font-mono font-black uppercase">
            <Sparkles size={13} />
            <span>VINILO DIGITAL RAPLIFE — EMISIÓN OFICIAL</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tighter">
            {currentTrack?.title || 'ESCUCHA LA REVOLUCIÓN'}
          </h2>

          <p className="text-sm font-bold text-gray-400">
            Artista: <span className="text-brand-yellow">{currentTrack?.artistName || 'RapLife Records'}</span>
          </p>

          <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
            Sintoniza las producciones oficiales de RapLife Records directamente desde la consola analógica. 
            Música de calle, producciones de alto calibre, y mezclas independientes de la comunidad.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase flex items-center gap-2 transition-all"
            >
              <ExternalLink size={14} className="text-brand-green" />
              <span>ABRIR EN SPOTIFY</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SpotifyTurntable;
