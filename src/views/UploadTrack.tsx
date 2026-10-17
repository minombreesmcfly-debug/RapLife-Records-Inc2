import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { Upload, Music, Check, Disc, AlertCircle } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const UploadTrackView: React.FC = () => {
  const { user, profile } = useAuth();
  const { refreshRadioTracks } = useMusic();
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState(profile?.artistName || profile?.displayName || '');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setError('Por favor completa el título y selecciona un archivo de audio.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Try local server upload first for instant response
      let audioUrl = '';
      try {
        const formData = new FormData();
        formData.append('track', file);
        formData.append('title', title);
        formData.append('artist', artistName || 'RapLife');

        const localRes = await fetch('/api/upload-radio-local', {
          method: 'POST',
          body: formData
        });
        if (localRes.ok) {
          const lData = await localRes.json();
          audioUrl = lData.audioUrl;
        }
      } catch (lErr) {
        console.warn('Local radio upload notice:', lErr);
      }

      // 2. Fallback to Cloudinary if local upload did not yield URL
      if (!audioUrl) {
        audioUrl = await uploadToCloudinary(file, 'tracks', 'video');
      }

      // 3. Register in Firestore
      try {
        await addDoc(collection(db, 'tracks'), {
          artistId: user?.uid || 'ANONYMOUS',
          artistName: artistName || 'Artista RapLife',
          title: title,
          audioUrl: audioUrl,
          coverUrl: '/assets/player_idle.png',
          isRadioInterstitial: false,
          approved: true,
          status: 'approved',
          createdAt: serverTimestamp()
        });
      } catch (fErr) {
        console.warn('Firestore track registration notice:', fErr);
      }

      await refreshRadioTracks();
      setSuccess(true);
      setTitle('');
      setFile(null);
    } catch (err: any) {
      setError(err?.message || 'Error al subir la canción.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-10 space-y-6 bg-brand-dark border-4 border-boombox-gray rounded-[2.5rem] text-left boombox-texture">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
          <Upload size={26} />
        </div>
        <div>
          <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">SUBIR CANCIÓN</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">ROTA TU MÚSICA EN LA RADIO 24/7</p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-brand-green/20 border border-brand-green/40 text-brand-green text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>¡Canción subida exitosamente y agregada a la rotación!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">TÍTULO DEL TRACK</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
            placeholder="Ej: Fuego Callejero"
            required
          />
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">ARTISTA / COLABORADORES</label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
            placeholder="Tu nombre artístico"
          />
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">ARCHIVO DE AUDIO (.MP3, .WAV, .M4A)</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full bg-black/60 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-brand-yellow file:text-black cursor-pointer"
            required
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-4 rounded-2xl bg-brand-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs shadow-glow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Disc className="animate-spin" size={16} />
              <span>SUBIENDO ARCHIVO...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>PUBLICAR TRACK EN RADIO</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadTrackView;
