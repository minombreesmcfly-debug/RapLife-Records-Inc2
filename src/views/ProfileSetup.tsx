import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Mic2, Disc, Sparkles, Upload, Check } from 'lucide-react';

const ProfileSetupView = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'fan' | 'artist'>('fan');
  const [category, setCategory] = useState('');
  const [plan, setPlan] = useState<'rookie' | 'pro' | 'fan'>('fan');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  if (profile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center animate-pulse">
       <Disc className="animate-spin text-brand-yellow mb-4" size={48} />
       <h1 className="text-2xl font-black italic uppercase">ABRIENDO EL ESTUDIO...</h1>
       <p className="text-gray-500 font-bold mt-2">Ya tienes un perfil configurado.</p>
    </div>
  );

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const isMcFly = user.email?.toLowerCase() === 'minombreesmcfly@gmail.com' || user.email?.toLowerCase() === 'macfly@gmail.com';
      const userProfileData = {
        uid: user.uid,
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Miembro RapLife',
        artistName: user.displayName || user.email?.split('@')[0] || 'Miembro RapLife',
        photoURL: user.photoURL || '',
        role: role,
        category: category,
        mainCategory: category || (role === 'artist' ? 'Artista' : 'Community'),
        plan: role === 'artist' ? plan : 'fan',
        spotifyUrl: role === 'artist' ? spotifyUrl : '',
        points: isMcFly ? 150000 : 100,
        adminPointsSeeded: isMcFly,
        createdAt: new Date().toISOString(),
        isPinned: false,
        bio: '',
        acceptedEcosystem: true,
        avatarUrl: user.photoURL || '',
      };

      try {
        await setDoc(doc(db, 'users', user.uid), userProfileData);
      } catch (dbErr) {
        console.warn("Firestore setDoc warning in handleFinish:", dbErr);
      }

      try {
        await fetch('/api/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userProfileData)
        });
      } catch (srvErr) {
        console.warn("Server user registration notice:", srvErr);
      }

      window.location.href = '/';
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-8 space-y-6 bg-brand-dark border-4 border-boombox-gray rounded-[2.5rem] text-left boombox-texture">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-yellow text-black rounded-2xl">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase text-white tracking-tight">CONFIGURA TU PERFIL</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">ÚNETE AL MOVIMIENTO RAPLIFE</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">TIPO DE MIEMBRO</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('fan')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                role === 'fan' ? 'border-brand-yellow bg-brand-yellow/10' : 'border-white/10 bg-black/40'
              }`}
            >
              <User size={20} className="text-brand-yellow mb-2" />
              <div className="font-black text-sm uppercase text-white">FAN / OYENTE</div>
              <div className="text-[10px] text-gray-400 mt-1">Escucha, acumula puntos y apoya a artistas</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('artist')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                role === 'artist' ? 'border-brand-yellow bg-brand-yellow/10' : 'border-white/10 bg-black/40'
              }`}
            >
              <Mic2 size={20} className="text-brand-yellow mb-2" />
              <div className="font-black text-sm uppercase text-white">ARTISTA / MC</div>
              <div className="text-[10px] text-gray-400 mt-1">Sube música, promociona tracks y colabora</div>
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">CATEGORÍA / ESPECIALIDAD</label>
          <input
            type="text"
            placeholder="Ej: Rapero, Productor, Beatmaker, Freestyler, Fan Activo"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
          />
        </div>

        {role === 'artist' && (
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">SPOTIFY ARTIST URL (OPCIONAL)</label>
            <input
              type="text"
              placeholder="https://open.spotify.com/artist/..."
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
            />
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-brand-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'GUARDANDO...' : 'FINALIZAR REGISTRO'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSetupView;
