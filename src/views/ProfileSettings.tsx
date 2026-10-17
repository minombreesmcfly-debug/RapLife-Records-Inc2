import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings, Save, Instagram, Music, User, Sparkles, Check } from 'lucide-react';

const ProfileSettingsView: React.FC = () => {
  const { user, profile, isAdmin, setProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    instagramUrl: '',
    spotifyUrl: '',
    appleMusicUrl: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || profile.artistName || '',
        bio: profile.bio || '',
        instagramUrl: profile.instagramUrl || '',
        spotifyUrl: profile.spotifyUrl || '',
        appleMusicUrl: profile.appleMusicUrl || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updated = {
        ...formData,
        artistName: formData.displayName,
        updatedAt: new Date().toISOString()
      };

      try {
        await updateDoc(doc(db, 'users', user.uid), updated);
      } catch (fErr) {
        console.warn('Firestore updateDoc warning:', fErr);
      }

      try {
        await fetch('/api/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.uid, uid: user.uid, ...profile, ...updated })
        });
      } catch (_) {}

      setProfile({ ...profile, ...updated });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-8 bg-brand-dark border-4 border-boombox-gray rounded-[2.5rem] text-left boombox-texture">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
            <Settings size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">AJUSTES DE PERFIL</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">GESTIONA TU IDENTIDAD EN RAPLIFE</p>
          </div>
        </div>

        {profile && (
          <div className="text-right">
            <span className="px-3 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow font-mono font-black text-xs">
              {profile.points || 0} PTS
            </span>
          </div>
        )}
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-brand-green/20 border border-brand-green/40 text-brand-green text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>¡Perfil actualizado con éxito!</span>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">NOMBRE ARTÍSTICO / APODO</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
            placeholder="Tu nombre en la calle"
          />
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">BIOGRAFÍA</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none resize-none"
            placeholder="Cuéntale a la escena quién eres y tu trayectoria..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Instagram size={14} className="text-pink-400" />
              <span>INSTAGRAM URL</span>
            </label>
            <input
              type="text"
              value={formData.instagramUrl}
              onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
              placeholder="https://instagram.com/..."
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Music size={14} className="text-brand-green" />
              <span>SPOTIFY URL</span>
            </label>
            <input
              type="text"
              value={formData.spotifyUrl}
              onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
              className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
              placeholder="https://open.spotify.com/artist/..."
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-brand-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs shadow-glow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save size={16} />
          <span>{loading ? 'GUARDANDO CAMBIOS...' : 'GUARDAR AJUSTES'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileSettingsView;
