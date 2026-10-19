import React from 'react';
import { useMusic } from '../context/MusicContext';
import { Radio, Volume2, VolumeX, Play, Pause, SkipForward } from 'lucide-react';

export const RadioStrip: React.FC = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, isMuted, toggleMute } = useMusic();

  return (
    <div className="fixed top-[72px] md:top-[88px] left-0 right-0 z-40 bg-neutral-950/90 border-b border-white/10 px-4 py-1.5 flex items-center justify-between text-xs backdrop-blur-md">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="flex items-center gap-1.5 text-brand-green font-mono font-black shrink-0">
          <Radio size={13} className="animate-pulse" />
          <span>ON AIR</span>
        </span>
        <span className="text-gray-400 truncate font-medium">
          {currentTrack ? `${currentTrack.artistName || 'RapLife'} - ${currentTrack.title}` : 'Sintonizando transmisión 24/7...'}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={togglePlay}
          className="p-1 hover:text-brand-yellow transition-colors cursor-pointer"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={nextTrack}
          className="p-1 hover:text-brand-yellow transition-colors cursor-pointer"
          title="Siguiente pista"
        >
          <SkipForward size={14} />
        </button>
        <button
          onClick={toggleMute}
          className="p-1 hover:text-brand-yellow transition-colors cursor-pointer"
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
};

export default RadioStrip;
