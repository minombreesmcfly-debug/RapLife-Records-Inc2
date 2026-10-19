import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Music, ExternalLink, Star } from 'lucide-react';

const ArtistsView: React.FC = () => {
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        let list: any[] = [];
        try {
          const q = query(collection(db, 'users'));
          const snap = await getDocs(q);
          list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (_) {}

        try {
          const sRes = await fetch('/api/users');
          if (sRes.ok) {
            const sList = await sRes.json();
            const map = new Map<string, any>();
            for (const a of sList) {
              const k = a.id || a.uid || a.email;
              if (k) map.set(k, a);
            }
            for (const a of list) {
              const k = a.id || a.uid || a.email;
              if (k) {
                const prev = map.get(k) || {};
                map.set(k, { ...prev, ...a });
              }
            }
            list = Array.from(map.values());
          }
        } catch (_) {}

        setArtists(list);
      } catch (err) {
        console.warn('Error fetching artists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 text-left">
        <div>
          <h1 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tight">ROSTER DE ARTISTAS</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">PRODUCTORES, MCS Y CREADORES DE RAPLIFE</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow font-mono font-black text-xs">
            {artists.length} MIEMBROS ACTIVOS
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-brand-yellow font-black uppercase tracking-widest text-sm">
          CARGANDO ROSTER...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {artists.map((artist) => (
            <Link
              key={artist.id || artist.uid}
              to={`/profile/${artist.id || artist.uid}`}
              className="bg-brand-dark border-2 border-white/10 hover:border-brand-yellow rounded-3xl p-5 space-y-4 group transition-all hover:scale-105 shadow-xl text-left flex flex-col"
            >
              <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10 relative">
                <img
                  src={artist.photoURL || artist.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'}
                  alt={artist.displayName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';
                  }}
                />
                {artist.isSponsor && (
                  <span className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-yellow text-black shadow-md">
                    <Star size={12} fill="currentColor" />
                  </span>
                )}
              </div>

              <div className="space-y-1 flex-1">
                <h3 className="font-black italic uppercase text-lg text-white group-hover:text-brand-yellow transition-colors truncate">
                  {artist.displayName || artist.artistName || 'Artista RapLife'}
                </h3>
                <p className="text-[10px] font-mono font-bold uppercase text-brand-green">
                  {artist.mainCategory || artist.role || 'Miembro'}
                </p>
                {artist.bio && (
                  <p className="text-xs text-gray-400 line-clamp-2 mt-2 leading-relaxed">
                    {artist.bio}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>VER PERFIL</span>
                <span className="text-brand-yellow font-black">{artist.points || 0} XP</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistsView;
