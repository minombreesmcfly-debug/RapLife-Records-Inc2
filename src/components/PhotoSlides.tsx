import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  id: string;
  image: string;
  title: string;
  tag: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: '1',
    image: '/assets/images/slide_arcade_hq_1787112020140.jpg',
    title: 'RAPLIFE RECORDS — CALLE & HIP HOP',
    tag: 'SELLO OFICIAL'
  },
  {
    id: '2',
    image: '/assets/images/urban_graffiti_wall_1787335563188.jpg',
    title: 'MCFLY & BLUE DREAM — VIBES',
    tag: 'LEGENDS'
  }
];

export const PhotoSlides: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % DEFAULT_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = DEFAULT_SLIDES[current];

  return (
    <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl group">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/graffiti_wall_bg.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-yellow text-black font-mono font-black text-[9px] uppercase tracking-wider inline-block mb-1.5">
              {slide.tag}
            </span>
            <h3 className="text-lg md:text-xl font-black italic uppercase text-white tracking-tight">
              {slide.title}
            </h3>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => setCurrent(prev => (prev - 1 + DEFAULT_SLIDES.length) % DEFAULT_SLIDES.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white/80 hover:text-brand-yellow transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => setCurrent(prev => (prev + 1) % DEFAULT_SLIDES.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white/80 hover:text-brand-yellow transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default PhotoSlides;
