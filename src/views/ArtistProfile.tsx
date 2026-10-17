import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Music, Instagram, ExternalLink, ArrowLeft, Star, Disc } from 'lucide-react';

const ArtistProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      if (!id) return;
      try {
        let data: any = null;
        try {
          const docRef = doc(db, 'users', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            data = { id: snap.id, ...snap.data() };
          }
        } catch (_) {}

        if (!data) {
          try {
            const res = await fetch('/api/users');
            if (res.ok) {
              const all = await res.json();
              data = all.find((u: any) => u.id === id || u.uid === id);
            }
          } catch (_) {}
        }

        setArtist(data);
      } catch (err) {
        console.warn('Error loading artist profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center animate-pulse text-brand-yellow font-black uppercase tracking-widest text-sm">
        CARGANDO PERFIL...
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase text-white">ARTISTA NO ENCONTRADO</h2>
        <Link to="/artists" className="text-brand-yellow underline text-xs font-bold uppercase">
          Volver al Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 text-left">
      <Link to="/artists" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white uppercase">
        <ArrowLeft size={14} />
        <span>Volver a Artistas</span>
      </Link>

      <div className="bg-brand-dark border-4 border-boombox-gray rounded-[2.5rem] p-6 md:p-10 boombox-texture space-y-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-3xl overflow-hidden border-4 border-brand-yellow/30 shadow-2xl shrink-0">
            <img
              src={artist.photoURL || artist.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'}
              alt={artist.displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';
              }}
            />
          </div>

          <div className="space-y-4 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow font-mono font-black text-xs uppercase">
              <Star size={12} fill="currentColor" />
              <span>{artist.mainCategory || artist.role || 'Miembro Oficial'}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tight">
              {artist.displayName || artist.artistName}
            </h1>

            {artist.bio && (
              <p className="text-sm text-gray-300 leading-relaxed">
                {artist.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {artist.spotifyUrl && (
                <a
                  href={artist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white uppercase flex items-center gap-2 transition-all"
                >
                  <Music size={14} className="text-brand-green" />
                  <span>Spotify Oficial</span>
                </a>
              )}
              {artist.instagramUrl && (
                <a
                  href={artist.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white uppercase flex items-center gap-2 transition-all"
                >
                  <Instagram size={14} className="text-pink-400" />
                  <span>Instagram</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfileView;
