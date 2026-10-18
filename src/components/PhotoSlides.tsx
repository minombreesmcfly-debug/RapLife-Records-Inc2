import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles, Disc, Radio, Flame, Shield, ArrowRight, Play, Film, ExternalLink, Volume2, VolumeX, Pause } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export interface SlideItem {
  id: string;
  type: 'video' | 'image';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor?: string;
  imageUrl?: string;
  videoEmbedUrl?: string;
  youtubeLink?: string;
  ctaText: string;
  ctaLink?: string;
  ctaAction?: 'radio' | 'game' | 'artists' | 'ecosystem' | 'upload' | 'link';
  tag: string;
}

const SLIDES_DATA: SlideItem[] = [
  {
    id: 'slide-video-intro',
    type: 'video',
    title: 'RAPLIFE RECORDS — VIDEO OFICIAL',
    subtitle: 'Estreno exclusivo en nuestra plataforma. Disfruta de la producción y el sonido del movimiento underground.',
    badge: '★ ESTRENO EN VIDEO ★',
    badgeColor: 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]',
    videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/rLumpsV0TUU?autoplay=1&mute=1&loop=1&playlist=rLumpsV0TUU&controls=1&rel=0&modestbranding=1&enablejsapi=1',
    youtubeLink: 'https://youtu.be/rLumpsV0TUU',
    imageUrl: '/assets/slides/mcfly_y3k.jpg',
    ctaText: 'VER EN YOUTUBE',
    ctaAction: 'link',
    ctaLink: 'https://youtu.be/rLumpsV0TUU',
    tag: 'YOUTUBE PREMIERE'
  },
  {
    id: 'slide-mcfly-y3k',
    type: 'image',
    title: 'MCFLY EMECÉ — Y3K RESISTANCE',
    subtitle: 'Fuck The System, Fuck The Snakes. La fuerza del rap contestatario y la resistencia de las calles.',
    badge: '★ EXCLUSIVO RAPLIFE ★',
    badgeColor: 'bg-brand-yellow text-black border-brand-yellow shadow-[0_0_12px_rgba(248,251,2,0.4)]',
    imageUrl: '/assets/slides/mcfly_y3k.jpg',
    ctaText: 'EXPLORAR ARTISTAS',
    ctaAction: 'artists',
    tag: 'Y3K CREW'
  },
  {
    id: 'slide-mcfly-emece',
    type: 'image',
    title: 'MCFLY EMECÉ — STREET ART & NEON',
    subtitle: 'Graffiti, ojos iluminados y visuales nocturnos. El hip hop en su estado más puro y callejero.',
    badge: '● LIVE STREET GRAFFITI',
    badgeColor: 'bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-500/50',
    imageUrl: '/assets/slides/mcfly_emece.jpg',
    ctaText: 'SINTONIZAR RADIO',
    ctaAction: 'radio',
    tag: 'UNDERGROUND ART'
  },
  {
    id: 'slide-blue-dream-couch',
    type: 'image',
    title: 'BLUE DREAM — CYBER RAP QUEEN',
    subtitle: 'Elegancia futurista, estética biónica y barras implacables. La vanguardia femenina del sello.',
    badge: '⚡ ARTISTA VIP',
    badgeColor: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50',
    imageUrl: '/assets/slides/blue_dream_couch.jpg',
    ctaText: 'VER ARTISTAS',
    ctaAction: 'artists',
    tag: 'CYBERPUNK TRAP'
  },
  {
    id: 'slide-jay-santana',
    type: 'image',
    title: 'JAY SANTANA — LATIN TRAP LORD',
    subtitle: 'Flow pesado, cadenas de diamantes y la crudeza del trap latino de máxima categoría.',
    badge: '💎 DIAMOND CLUB',
    badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
    imageUrl: '/assets/slides/jay_santana.jpg',
    ctaText: 'EXPLORAR SELLO',
    ctaAction: 'artists',
    tag: 'TRAP POWER'
  },
  {
    id: 'slide-mcfly-doom',
    type: 'image',
    title: 'MCFLY & BLUE DREAM — BOOMBOX VIBES',
    subtitle: 'Tributo a las raíces del hip hop (MF DOOM), sonido análogo y sintonía FM 108.9 MHz las 24 horas.',
    badge: '📻 ANALOG & DIGI SOUND',
    badgeColor: 'bg-brand-green/25 text-brand-green border-brand-green/50',
    imageUrl: '/assets/slides/mcfly_doom_radio.jpg',
    ctaText: 'SINTONIZAR RADIO',
    ctaAction: 'radio',
    tag: 'BOOMBOX LEGENDS'
  },
  {
    id: 'slide-blue-dream-peace',
    type: 'image',
    title: 'BLUE DREAM — PEACE & BARS',
    subtitle: 'Lealtad, respeto y pasión por la música independiente en cada compás.',
    badge: '★ RAP LIFE CREW ★',
    badgeColor: 'bg-blue-500/25 text-blue-300 border-blue-500/50',
    imageUrl: '/assets/slides/blue_dream_peace.jpg',
    ctaText: 'SUBIR TU TRACK',
    ctaAction: 'upload',
    tag: 'RAPLIFE SESSIONS'
  },
  {
    id: 'slide-raplife-arcade',
    type: 'image',
    title: 'RAP LIFE RECORDS HQ — ARCADE LAB',
    subtitle: 'Nuestro cuartel general: sala de arcade retro, estudio de grabación profesional y live streams.',
    badge: '🕹️ HEADQUARTERS & ARCADE',
    badgeColor: 'bg-purple-500/25 text-purple-300 border-purple-500/50',
    imageUrl: '/assets/slides/raplife_arcade_studio.jpg',
    ctaText: 'JUGAR DESAFÍO ARCADE',
    ctaAction: 'game',
    tag: 'HQ EXPERIENCE'
  }
];

export default function PhotoSlides() {
  const [slides] = useState<SlideItem[]>(SLIDES_DATA);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { isPlaying, togglePlay } = useMusic();
  const { user } = useAuth();

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex] || slides[0];
  const isVideoSlide = currentSlide.type === 'video';

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay: pauses if user hovers or if currently viewing video slide
  useEffect(() => {
    if (isPaused || isVideoSlide || totalSlides <= 1) return;
    const interval = setInterval(handleNext, 7000);
    return () => clearInterval(interval);
  }, [handleNext, isPaused, isVideoSlide, totalSlides]);

  const handleCtaClick = (slide: SlideItem) => {
    if (slide.ctaAction === 'radio') {
      if (!isPlaying) togglePlay();
      document.getElementById('spotify-vinyl')?.scrollIntoView({ behavior: 'smooth' });
    } else if (slide.ctaAction === 'game') {
      document.getElementById('game')?.scrollIntoView({ behavior: 'smooth' });
    } else if (slide.ctaAction === 'artists') {
      document.getElementById('music')?.scrollIntoView({ behavior: 'smooth' });
    } else if (slide.ctaAction === 'link' && slide.ctaLink) {
      window.open(slide.ctaLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      id="photo-slides"
      className="bg-black/95 border-2 md:border-4 border-boombox-gray rounded-2xl md:rounded-[3rem] overflow-hidden shadow-2xl relative boombox-texture select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative Screws */}
      <div className="absolute top-3.5 left-3.5 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-30 transition-transform group-hover:rotate-45 pointer-events-none" />
      <div className="absolute top-3.5 right-3.5 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-30 transition-transform group-hover:rotate-45 pointer-events-none" />
      <div className="absolute bottom-3.5 left-3.5 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-30 transition-transform group-hover:rotate-45 pointer-events-none" />
      <div className="absolute bottom-3.5 right-3.5 w-3 h-3 rounded-full bg-boombox-gray border-2 border-black z-30 transition-transform group-hover:rotate-45 pointer-events-none" />

      {/* Main Slide Carousel Container */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] w-full min-h-[380px] md:min-h-[480px] flex items-center justify-center overflow-hidden bg-neutral-950">
        <AnimatePresence mode="wait">
          {isVideoSlide ? (
            /* VIDEO SLIDE */
            <motion.div
              key="video-slide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full flex flex-col bg-black"
            >
              {/* Top Video Header Strip */}
              <div className="bg-neutral-950/90 border-b border-white/10 px-4 md:px-8 py-2.5 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-red-600 text-white rounded-md flex items-center justify-center animate-pulse">
                    <Film size={14} />
                  </span>
                  <span className="text-[10px] md:text-xs font-black italic uppercase text-white tracking-wider">
                    {currentSlide.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-500/40 text-red-400 text-[9px] font-mono font-bold uppercase">
                    ESTRENO YOUTUBE
                  </span>
                  {currentSlide.youtubeLink && (
                    <a
                      href={currentSlide.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                      title="Abrir en YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              {/* YouTube Iframe Player Frame */}
              <div className="relative w-full flex-grow bg-black overflow-hidden flex items-center justify-center">
                <iframe
                  src={currentSlide.videoEmbedUrl}
                  title={currentSlide.title}
                  className="w-full h-full border-0 absolute inset-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Bottom Video Action Bar */}
              <div className="bg-neutral-950/95 border-t border-white/10 px-4 md:px-8 py-2.5 flex items-center justify-between z-20 shrink-0">
                <p className="text-[10px] md:text-xs text-gray-300 font-medium truncate max-w-md">
                  {currentSlide.subtitle}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={currentSlide.youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <span>YOUTUBE</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </motion.div>
          ) : (
            /* IMAGE SLIDE */
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Background Slide Image */}
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="w-full h-full object-cover object-center filter brightness-[0.8] contrast-[1.08] transition-transform duration-7000 scale-100 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/Banner.png';
                }}
                referrerPolicy="no-referrer"
              />

              {/* High Contrast Vignettes & Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent opacity-95" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
              
              {/* Subtle retro scanlines */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-50" />

              {/* Slide Caption Box */}
              <div className="absolute inset-0 p-6 md:p-12 lg:p-16 flex flex-col justify-end z-20 max-w-3xl">
                {/* Badge & Category Row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-mono font-black uppercase tracking-wider border shadow-md ${currentSlide.badgeColor || 'bg-brand-yellow text-black border-brand-yellow'}`}>
                    <Sparkles size={12} />
                    <span>{currentSlide.badge}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md bg-black/70 border border-white/15 text-[9px] md:text-[10px] font-mono text-gray-200 font-bold uppercase tracking-widest backdrop-blur-sm">
                    {currentSlide.tag}
                  </span>

                  <span className="ml-auto text-[10px] font-mono text-brand-yellow font-bold hidden sm:inline-block bg-black/60 px-2.5 py-0.5 rounded-md border border-white/10">
                    SLIDE {currentIndex + 1} / {totalSlides}
                  </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] mb-2 leading-tight">
                  {currentSlide.title}
                </h1>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm md:text-base text-gray-200 font-medium leading-relaxed max-w-2xl drop-shadow-md mb-6 line-clamp-2 sm:line-clamp-3">
                  {currentSlide.subtitle}
                </p>

                {/* Action CTA Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  {renderCtaButton(currentSlide, handleCtaClick, user)}

                  <button
                    onClick={() => {
                      if (!isPlaying) togglePlay();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/20 hover:border-brand-yellow text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-95"
                  >
                    <Radio size={14} className={isPlaying ? 'text-brand-green animate-pulse' : 'text-brand-yellow'} />
                    <span>{isPlaying ? 'RADIO ON-AIR ●' : 'ESCUCHAR RADIO'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Previous Navigation Button */}
        <button
          onClick={handlePrev}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-2.5 md:p-3.5 rounded-full bg-black/75 hover:bg-brand-yellow hover:text-black text-white border border-white/25 opacity-85 hover:opacity-100 transition-all z-30 cursor-pointer shadow-2xl active:scale-90"
          title="Slide anterior"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Next Navigation Button */}
        <button
          onClick={handleNext}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-2.5 md:p-3.5 rounded-full bg-black/75 hover:bg-brand-yellow hover:text-black text-white border border-white/25 opacity-85 hover:opacity-100 transition-all z-30 cursor-pointer shadow-2xl active:scale-90"
          title="Siguiente slide"
        >
          <ChevronRight size={22} />
        </button>

        {/* Slide Indicator Navigation Dots */}
        <div className="absolute bottom-4 right-6 md:right-12 z-30 flex items-center gap-1.5 md:gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'w-7 bg-brand-yellow shadow-[0_0_10px_rgba(248,251,2,0.8)]'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              title={`Ir a ${slide.title}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function renderCtaButton(slide: SlideItem, onCta: (s: SlideItem) => void, user: any) {
  if (slide.ctaAction === 'upload') {
    return (
      <Link
        to={user ? '/upload' : '/settings'}
        className="px-5 py-2.5 rounded-xl bg-brand-yellow hover:bg-brand-yellow/90 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-glow cursor-pointer active:scale-95"
      >
        <span>{slide.ctaText}</span>
        <ArrowRight size={14} />
      </Link>
    );
  }

  if (slide.ctaAction === 'link' && slide.ctaLink) {
    return (
      <a
        href={slide.ctaLink}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-2.5 rounded-xl bg-brand-yellow hover:bg-brand-yellow/90 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-glow cursor-pointer active:scale-95"
      >
        <span>{slide.ctaText}</span>
        <ExternalLink size={14} />
      </a>
    );
  }

  return (
    <button
      onClick={() => onCta(slide)}
      className="px-5 py-2.5 rounded-xl bg-brand-yellow hover:bg-brand-yellow/90 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-glow cursor-pointer active:scale-95"
    >
      <span>{slide.ctaText}</span>
      <ArrowRight size={14} />
    </button>
  );
}
