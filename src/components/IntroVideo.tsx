import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VideoItem, VideoPlaylistConfig } from '../types';

// Helper to extract YouTube embed info
function getEmbedInfo(rawUrl: string): { isEmbed: boolean; embedUrl: string | null; youtubeWatchUrl: string } {
  const defaultId = 'rLumpsV0TUU';
  
  if (!rawUrl) {
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${defaultId}?autoplay=1&mute=1&loop=1&playlist=${defaultId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&enablejsapi=1`,
      youtubeWatchUrl: `https://youtu.be/${defaultId}`
    };
  }

  const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&enablejsapi=1`,
      youtubeWatchUrl: `https://youtu.be/${videoId}`
    };
  }

  return {
    isEmbed: false,
    embedUrl: null,
    youtubeWatchUrl: rawUrl.startsWith('http') ? rawUrl : `https://youtu.be/${defaultId}`
  };
}

// Helper to resolve video sources
function resolveVideoSources(item?: VideoItem): { primary: string; fallback: string; isEmbed: boolean; embedUrl: string | null; youtubeWatchUrl: string } {
  const fallbackYoutube = 'https://youtu.be/rLumpsV0TUU';
  
  if (!item || !item.url) {
    const embed = getEmbedInfo(fallbackYoutube);
    return {
      primary: fallbackYoutube,
      fallback: fallbackYoutube,
      isEmbed: true,
      embedUrl: embed.embedUrl,
      youtubeWatchUrl: embed.youtubeWatchUrl
    };
  }

  const rawUrl = item.url.trim();
  const embed = getEmbedInfo(rawUrl);

  if (embed.isEmbed) {
    return {
      primary: rawUrl,
      fallback: rawUrl,
      isEmbed: true,
      embedUrl: embed.embedUrl,
      youtubeWatchUrl: embed.youtubeWatchUrl
    };
  }

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return {
      primary: rawUrl,
      fallback: rawUrl,
      isEmbed: false,
      embedUrl: null,
      youtubeWatchUrl: rawUrl
    };
  }

  let cleanName = item.fileName || rawUrl;
  cleanName = cleanName.replace(/^\/?(assets\/|video\/|public\/assets\/|dist\/assets\/|api\/stream-video\?file=)?/, '').replace(/^\/+/, '');
  try {
    cleanName = decodeURIComponent(cleanName);
  } catch (_) {}

  return {
    primary: `/api/stream-video?file=${encodeURIComponent(cleanName || 'raplife_records_intro.mp4')}`,
    fallback: `/assets/${cleanName || 'raplife_records_intro.mp4'}`,
    isEmbed: false,
    embedUrl: null,
    youtubeWatchUrl: fallbackYoutube
  };
}

const DEFAULT_WELCOME_VIDEO: VideoItem = {
  id: 'raplife_official_welcome_video',
  title: 'RAPLIFE RECORDS',
  url: 'https://youtu.be/rLumpsV0TUU',
  sourceType: 'link',
  fileName: 'rLumpsV0TUU',
  category: 'Oficial'
};

export default function IntroVideo({ compact = false }: { compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist, setPlaylist] = useState<VideoItem[]>([DEFAULT_WELCOME_VIDEO]);

  // Load active playlist from Firestore or LocalStorage if customized
  const loadPlaylist = useCallback(async () => {
    try {
      let loadedVideos: VideoItem[] = [];

      try {
        const configDoc = await getDoc(doc(db, 'system_config', 'video_playlist'));
        if (configDoc.exists()) {
          const data = configDoc.data() as VideoPlaylistConfig;
          if (data && Array.isArray(data.videos) && data.videos.length > 0) {
            loadedVideos = data.videos;
          }
        }
      } catch (_) {}

      if (loadedVideos.length === 0) {
        try {
          const localStored = localStorage.getItem('raplife_video_playlist_config');
          if (localStored) {
            const parsed = JSON.parse(localStored);
            if (Array.isArray(parsed?.videos) && parsed.videos.length > 0) {
              loadedVideos = parsed.videos;
            }
          }
        } catch (_) {}
      }

      if (loadedVideos.length > 0) {
        setPlaylist(loadedVideos);
      } else {
        setPlaylist([DEFAULT_WELCOME_VIDEO]);
      }
    } catch (_) {
      setPlaylist([DEFAULT_WELCOME_VIDEO]);
    }
  }, []);

  useEffect(() => {
    loadPlaylist();

    try {
      const unsub = onSnapshot(doc(db, 'system_config', 'video_playlist'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as VideoPlaylistConfig;
          if (data && Array.isArray(data.videos) && data.videos.length > 0) {
            setPlaylist(data.videos);
          }
        }
      }, () => {});
      return () => unsub();
    } catch (_) {}
  }, [loadPlaylist]);

  const currentVideo = playlist[currentIndex] || playlist[0] || DEFAULT_WELCOME_VIDEO;
  const sources = resolveVideoSources(currentVideo);
  const youtubeUrl = sources.youtubeWatchUrl || 'https://youtu.be/rLumpsV0TUU';

  // Toggle audio on video without stopping the radio!
  const toggleAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    // Send command to YouTube iframe player
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = nextMuted ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: command,
          args: []
        }),
        '*'
      );
      if (!nextMuted) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'setVolume',
            args: [100]
          }),
          '*'
        );
      }
    }

    // HTML5 fallback video
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  return (
    <section id="welcome-video-intro" className={compact ? "w-full my-1" : "w-full my-6 md:my-10"}>
      <div className={`relative bg-black/80 backdrop-blur-md ${compact ? 'border-2 border-boombox-gray/80 rounded-2xl' : 'border-2 md:border-4 border-boombox-gray/80 rounded-2xl md:rounded-[3rem]'} overflow-hidden shadow-2xl boombox-texture group`}>
        
        {/* Main Clean Video Frame (No controls, no timeline, auto-looping) */}
        <div className="relative aspect-video w-full bg-neutral-950/80 flex items-center justify-center overflow-hidden">
          {sources.isEmbed && sources.embedUrl ? (
            <iframe
              ref={iframeRef}
              key={sources.embedUrl}
              src={sources.embedUrl}
              title="RapLife Records Official Video"
              className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              key={currentVideo?.url || currentIndex}
              src={sources.primary}
              poster="/assets/Banner.png"
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="w-full h-full object-cover bg-black"
            >
              <source src={sources.primary} type="video/mp4" />
              <source src={sources.fallback} type="video/mp4" />
            </video>
          )}

          {/* Top Center YouTube Button */}
          <div className="absolute top-3 md:top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 md:px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(220,38,38,0.75)] backdrop-blur-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
              title="Ver en YouTube"
            >
              <svg 
                className="w-4 h-4 md:w-5 md:h-5 fill-current" 
                viewBox="0 0 24 24"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="font-black tracking-widest text-[11px] md:text-xs">YOUTUBE</span>
              <ExternalLink size={13} className="opacity-90" />
            </a>
          </div>

          {/* Center Neon Yellow Audio Toggle Button */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-full font-black text-xs md:text-sm uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-[0_0_25px_rgba(248,251,2,0.85)] border-2 border-black ${
                isMuted
                  ? 'bg-brand-yellow text-black hover:bg-yellow-300 hover:scale-105'
                  : 'bg-brand-yellow text-black ring-4 ring-brand-yellow/30 hover:bg-yellow-300 hover:scale-105'
              }`}
              title={isMuted ? 'Activar sonido del video' : 'Silenciar video'}
            >
              {isMuted ? (
                <>
                  <VolumeX size={18} className="text-black" />
                  <span>ACTIVAR AUDIO</span>
                </>
              ) : (
                <>
                  <Volume2 size={18} className="text-black animate-pulse" />
                  <span>SILENCIAR AUDIO</span>
                </>
              )}
            </button>
          </div>

          {/* Corner Screws */}
          <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-20 pointer-events-none opacity-80" />
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-20 pointer-events-none opacity-80" />
          <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-20 pointer-events-none opacity-80" />
          <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-20 pointer-events-none opacity-80" />
        </div>

      </div>
    </section>
  );
}
