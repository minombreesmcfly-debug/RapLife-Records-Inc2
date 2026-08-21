import React from 'react';
import { SocialLinks } from './SocialLinks';
import { Radio, Sparkles, FolderArchive, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-black/70 backdrop-blur-md border-t-4 md:border-t-8 border-boombox-gray/80 mt-8 md:mt-12 pt-6 pb-6 px-4 md:px-8 relative overflow-hidden boombox-texture">
      {/* Decorative top lighting glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-brand-yellow to-transparent opacity-60" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-4">
        
        {/* BRAND & LOGO */}
        <div className="flex flex-col items-center gap-2">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-neutral-950/90 rounded-full border-2 md:border-4 border-brand-yellow/30 speaker-grill flex items-center justify-center shadow-inner relative overflow-hidden group-hover:scale-105 transition-transform">
              <img src="/assets/Logo.png" alt="RapLife Logo" className="w-[85%] h-[85%] object-contain relative z-10" />
              <div className="w-full h-full bg-brand-yellow/10 rounded-full animate-pulse absolute inset-0" />
            </div>
            <div className="text-left">
              <h2 className="text-xl md:text-2xl font-black tracking-tighter glow-yellow italic uppercase leading-none">RAPLIFE RECORDS</h2>
              <p className="text-[8px] md:text-[9px] font-black text-white/40 tracking-[0.3em] uppercase">BOOMBOX RADIO & ECOSYSTEM</p>
            </div>
          </Link>
          <p className="text-[11px] text-gray-300/90 max-w-lg font-medium leading-normal">
            Plataforma oficial de hip-hop, producciones de alto calibre, transmisiones en vivo y espacio exclusivo para artistas independientes.
          </p>
        </div>

        {/* SOCIAL MEDIA SECTION WITH COMPACT BADGES */}
        <div className="w-full max-w-xl bg-black/60 border border-white/10 p-4 rounded-2xl space-y-3 shadow-xl backdrop-blur-sm relative">
          <div className="flex items-center justify-center gap-1.5 text-brand-yellow">
            <Sparkles size={13} />
            <h3 className="text-[11px] font-black italic uppercase tracking-wider text-brand-yellow">
              NUESTRAS REDES SOCIALES OFICIALES
            </h3>
            <Sparkles size={13} />
          </div>

          {/* SOCIAL LINKS BADGES */}
          <SocialLinks variant="footer" className="pt-0.5" />

          {/* DIRECT ZIP DOWNLOAD BUTTON */}
          <div className="pt-2 border-t border-white/10 flex justify-center">
            <a
              href="/raplife-records-website.zip"
              download="raplife-records-website.zip"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-brand-yellow/15 hover:bg-brand-yellow text-brand-yellow hover:text-black border border-brand-yellow/40 font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              title="Descargar código fuente completo en archivo .ZIP"
            >
              <FolderArchive size={13} />
              <span>DESCARGAR WEBSITE COMPLETO (.ZIP)</span>
              <Download size={12} />
            </a>
          </div>
        </div>

        {/* FOOTER BOTTOM METADATA & COPYRIGHT */}
        <div className="w-full border-t border-white/10 pt-3 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-brand-yellow animate-pulse" />
            <span>RAPLIFE RECORDS INC. © {new Date().getFullYear()} — TODOS LOS DERECHOS RESERVADOS</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-gray-300">
            <span className="text-brand-green">● EMISIÓN 24/7 EN VIVO</span>
            <span>•</span>
            <span className="text-brand-yellow">CALLE & HIP-HOP</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
