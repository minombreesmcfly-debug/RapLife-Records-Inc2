import React from 'react';
import { Instagram, Youtube, Music } from 'lucide-react';

interface SocialLinksProps {
  variant?: 'header' | 'footer' | 'default';
  className?: string;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ variant = 'default', className = '' }) => {
  const links = [
    {
      name: 'Instagram',
      url: 'https://instagram.com/rapliferecords',
      icon: Instagram,
      color: 'hover:text-pink-400'
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@rapliferecords',
      icon: Youtube,
      color: 'hover:text-red-500'
    },
    {
      name: 'Spotify',
      url: 'https://open.spotify.com',
      icon: Music,
      color: 'hover:text-brand-green'
    }
  ];

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-gray-400 transition-colors ${link.color}`}
              title={link.name}
            >
              <Icon size={16} />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-brand-yellow transition-all"
          >
            <Icon size={14} />
            <span>{link.name}</span>
          </a>
        );
      })}
    </div>
  );
};

export default SocialLinks;
