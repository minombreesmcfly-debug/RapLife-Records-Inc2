import React from 'react';
import { motion } from 'motion/react';
import { Youtube, Facebook } from 'lucide-react';

export const TikTokIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.34 22a6.33 6.33 0 0 0 6.33-6.33V9.05a8.16 8.16 0 0 0 4.92 1.62V7.22a4.83 4.83 0 0 1-1-.53z" />
  </svg>
);

export const SOCIAL_NETWORKS = [
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@raplife.records',
    url: 'https://www.tiktok.com/@raplife.records',
    icon: TikTokIcon,
    color: 'hover:text-[#00F2FE] hover:border-[#00F2FE] hover:shadow-[0_0_15px_rgba(0,242,254,0.5)]',
    bgHover: 'group-hover:bg-[#FF0050]/20',
    badgeBg: 'bg-[#FF0050]/10 text-[#00F2FE] border-[#00F2FE]/30'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'RapLife Records',
    url: 'https://www.facebook.com/share/1DMRjfMpdo/',
    icon: Facebook,
    color: 'hover:text-[#1877F2] hover:border-[#1877F2] hover:shadow-[0_0_15px_rgba(24,119,242,0.5)]',
    bgHover: 'group-hover:bg-[#1877F2]/20',
    badgeBg: 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/30'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@raplife.records',
    url: 'https://www.youtube.com/@raplife.records',
    icon: Youtube,
    color: 'hover:text-[#FF0000] hover:border-[#FF0000] hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]',
    bgHover: 'group-hover:bg-[#FF0000]/20',
    badgeBg: 'bg-[#FF0000]/10 text-red-500 border-red-500/30'
  }
];

interface SocialLinksProps {
  variant?: 'compact' | 'header' | 'footer' | 'card';
  showLabels?: boolean;
  className?: string;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ 
  variant = 'compact', 
  showLabels = false,
  className = ''
}) => {
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-1.5 md:gap-2 ${className}`}>
        {SOCIAL_NETWORKS.map((net) => {
          const Icon = net.icon;
          return (
            <motion.a
              key={net.id}
              href={net.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Siguenos en ${net.name}`}
              title={`RapLife Records en ${net.name} (${net.handle})`}
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`p-1.5 md:p-2 bg-black border border-white/10 text-gray-300 rounded-lg md:rounded-xl flex items-center justify-center transition-all cursor-pointer group ${net.color}`}
            >
              <Icon size={16} className="transition-transform group-hover:scale-110" />
            </motion.a>
          );
        })}
      </div>
    );
  }

  if (variant === 'footer' || variant === 'card') {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 ${className}`}>
        {SOCIAL_NETWORKS.map((net) => {
          const Icon = net.icon;
          return (
            <motion.a
              key={net.id}
              href={net.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`flex items-center gap-2.5 px-4 py-2.5 bg-black/80 border-2 border-white/15 rounded-2xl text-white font-bold transition-all group cursor-pointer shadow-lg ${net.color}`}
            >
              <div className={`p-1.5 rounded-xl bg-white/5 ${net.bgHover} transition-colors flex items-center justify-center`}>
                <Icon size={18} className="transition-transform group-hover:rotate-6 group-hover:scale-110" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono text-gray-400 group-hover:text-white uppercase tracking-widest leading-none">
                  {net.name}
                </span>
                <span className="text-xs font-black italic tracking-tight text-brand-yellow group-hover:text-white leading-tight">
                  {net.handle}
                </span>
              </div>
            </motion.a>
          );
        })}
      </div>
    );
  }

  // Default compact variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {SOCIAL_NETWORKS.map((net) => {
        const Icon = net.icon;
        return (
          <motion.a
            key={net.id}
            href={net.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={net.name}
            title={`${net.name}: ${net.handle}`}
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={{ scale: 0.92 }}
            className={`p-2 bg-black/90 border border-white/20 rounded-xl text-gray-300 flex items-center gap-1.5 transition-all cursor-pointer ${net.color}`}
          >
            <Icon size={18} />
            {showLabels && <span className="text-xs font-black uppercase italic tracking-wider">{net.name}</span>}
          </motion.a>
        );
      })}
    </div>
  );
};

export default SocialLinks;
