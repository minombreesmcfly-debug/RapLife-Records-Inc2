import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { collection, query, getDocs, doc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Shield, Upload, Star, Music, User, Check, X, Radio, PlayCircle,
  Pencil, Trash, Save, Play, Users, Search, RefreshCw, Disc, Pause
} from 'lucide-react';
import { Track } from '../types';
import { uploadToCloudinary } from '../lib/cloudinary';

export const AdminView: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  const { playlist, playRadioPlaylist, currentTrack, isPlaying, togglePlay, refreshRadioTracks } = useMusic();

  const [artists, setArtists] = useState<any[]>([]);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  // Radio Upload State
  const [radioFile, setRadioFile] = useState<File | null>(null);
  const [radioTitle, setRadioTitle] = useState('');
  const [radioArtist, setRadioArtist] = useState('RapLife Records');
  const [uploadingRadio, setUploadingRadio] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergeWithServerUsers = async (firestoreList: any[]) => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers: any[] = await res.json();
        const mergedMap = new Map<string, any>();
        for (const u of serverUsers || []) {
          const k = u.id || u.uid || u.email;
          if (k) mergedMap.set(k, u);
        }
        for (const u of firestoreList) {
          const k = u.id || u.uid || u.email;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, { ...existing, ...u });
          }
        }
        const combined = Array.from(mergedMap.values());
        if (combined.length > 0) {
          setArtists(combined);
          return;
        }
      }
    } catch (err) {
      console.warn("[ADMIN] Could not fetch server users:", err);
    }
    if (firestoreList.length > 0) {
      setArtists(firestoreList);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    let unsubscribeUsers: (() => void) | null = null;

    try {
      const artistQ = query(collection(db, 'users'));
      unsubscribeUsers = onSnapshot(artistQ, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        mergeWithServerUsers(list);
      }, (err) => {
        console.warn("[ADMIN] Users onSnapshot notice, falling back to server:", err);
        mergeWithServerUsers([]);
      });
    } catch (err: any) {
      console.warn("[ADMIN] Error subscribing to users collection:", err);
      mergeWithServerUsers([]);
    }

    return () => {
      if (unsubscribeUsers) {
        unsubscribeUsers();
      }
    };
  }, [isAdmin]);

  const refreshUsersList = async () => {
    setIsRefreshingUsers(true);
    try {
      let firestoreUsers: any[] = [];
      try {
        const snap = await getDocs(collection(db, 'users'));
        firestoreUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (fErr) {
        console.warn("Manual firestore users fetch warning:", fErr);
      }

      let serverUsers: any[] = [];
      try {
        const res = await fetch('/api/users');
        if (res.ok) serverUsers = await res.json();
      } catch (sErr) {
        console.warn("Manual server users fetch warning:", sErr);
      }

      const map = new Map<string, any>();
      for (const u of serverUsers || []) {
        const k = u.id || u.uid || u.email;
        if (k) map.set(k, u);
      }
      for (const u of firestoreUsers) {
        const k = u.id || u.uid || u.email;
        if (k) {
          const prev = map.get(k) || {};
          map.set(k, { ...prev, ...u });
        }
      }
      const combined = Array.from(map.values());
      if (combined.length > 0) {
        setArtists(combined);
      }
    } finally {
      setIsRefreshingUsers(false);
    }
  };

  const handleUploadRadioTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!radioFile || !radioTitle) {
      setUploadError('Por favor selecciona un archivo y asigna un título.');
      return;
    }

    setUploadingRadio(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      let audioUrl = '';
      try {
        const formData = new FormData();
        formData.append('track', radioFile);
        formData.append('title', radioTitle);
        formData.append('artist', radioArtist || 'RapLife Records');

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

      if (!audioUrl) {
        audioUrl = await uploadToCloudinary(radioFile, 'radio', 'video');
      }

      await refreshRadioTracks();
      setUploadSuccess(true);
      setRadioTitle('');
      setRadioFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Error al subir canción a la radio.');
    } finally {
      setUploadingRadio(false);
    }
  };

  const handleDeleteRadioTrack = async (track: Track) => {
    if (!confirm(`¿Eliminar "${track.title}" de la radio?`)) return;
    try {
      await fetch('/api/delete-radio-local', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: track.fullName || track.title })
      });
      await refreshRadioTracks();
    } catch (err) {
      console.warn('Error deleting track:', err);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-12 text-left">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-center gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 boombox-texture">
        <div className="p-5 bg-brand-yellow text-black rounded-3xl shadow-glow">
          <Shield size={32} />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter underline decoration-brand-yellow/30">
            PANEL DE CONTROL
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-1">
            GESTIÓN MAESTRA DE RAPLIFE RECORDS INC.
          </p>
        </div>
      </header>

      {/* RADIO MANAGER SECTION */}
      <div className="bg-brand-dark p-8 rounded-[2.5rem] border-4 border-boombox-gray space-y-8 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
            <Radio size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              RAPLIFE RADIO (EMISIÓN 24/7)
            </h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-0.5">
              SUBIDA Y GESTIÓN DE TRACKS EN LA PLAYLIST LOCAL Y GLOBAL
            </p>
          </div>
        </div>

        {uploadSuccess && (
          <div className="p-4 rounded-2xl bg-brand-green/20 border border-brand-green/40 text-brand-green text-xs font-bold flex items-center gap-2">
            <Check size={16} />
            <span>¡Canción añadida exitosamente a la emisión de radio!</span>
          </div>
        )}

        {uploadError && (
          <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-2">
            <X size={16} />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUploadRadioTrack} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">TÍTULO DEL TRACK</label>
            <input
              type="text"
              placeholder="Ej: Freestyle Callejero Vol 1"
              value={radioTitle}
              onChange={(e) => setRadioTitle(e.target.value)}
              className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">ARTISTA</label>
            <input
              type="text"
              placeholder="Ej: McFly EmeCe"
              value={radioArtist}
              onChange={(e) => setRadioArtist(e.target.value)}
              className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">ARCHIVO AUDIO (.MP3 / .WAV)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setRadioFile(e.target.files?.[0] || null)}
              className="w-full bg-black/60 border border-white/10 p-3.5 rounded-2xl text-xs font-bold text-white focus:border-brand-yellow outline-none file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-brand-yellow file:text-black cursor-pointer"
              required
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={uploadingRadio}
              className="w-full py-4 rounded-2xl bg-brand-yellow hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-wider shadow-glow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploadingRadio ? (
                <>
                  <Disc className="animate-spin" size={16} />
                  <span>SUBIENDO ARCHIVO A LA RADIO...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>SUBIR A ROTACIÓN DE RADIO</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Current Radio Tracks Table */}
        <div className="space-y-3">
          <h3 className="text-lg font-black italic uppercase text-white tracking-tight">
            TRACKS EN ROTACIÓN ({playlist.length})
          </h3>

          <div className="bg-black/50 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {playlist.map((track, i) => (
              <div key={track.id || track.audioUrl || i} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-brand-yellow text-xs font-black">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="font-black italic uppercase text-white truncate text-sm">{track.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{track.artistName || 'RapLife'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => playRadioPlaylist(playlist, i)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-brand-yellow hover:text-black text-gray-300 transition-all cursor-pointer"
                    title="Reproducir ahora"
                  >
                    <Play size={14} className="fill-current" />
                  </button>
                  <button
                    onClick={() => handleDeleteRadioTrack(track)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 transition-all cursor-pointer"
                    title="Eliminar track"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REGISTERED USERS & ROLES DASHBOARD SECTION */}
      <div className="bg-brand-dark p-8 rounded-[2.5rem] border-4 border-boombox-gray space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">USUARIOS REGISTRADOS Y ROLES</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-0.5">
                Panel de control de miembros, patrocinios y asignación de categorías del ecosistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshUsersList()}
              disabled={isRefreshingUsers}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refrescar y sincronizar lista de usuarios"
            >
              <RefreshCw size={13} className={isRefreshingUsers ? "animate-spin text-brand-yellow" : "text-brand-yellow"} />
              <span>{isRefreshingUsers ? 'ACTUALIZANDO...' : 'ACTUALIZAR USUARIOS'}</span>
            </button>
            <span className="px-4 py-2 bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl text-brand-yellow font-black italic text-sm">
              TOTAL: {artists.length} USUARIOS
            </span>
          </div>
        </div>

        {/* Search & Role Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo de usuario..."
              className="w-full bg-black/50 border border-white/10 pl-12 pr-4 py-3.5 rounded-2xl focus:border-brand-yellow outline-none text-xs font-bold text-white placeholder:text-gray-500"
              value={userSearchQuery}
              onChange={e => setUserSearchQuery(e.target.value)}
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={userRoleFilter}
              onChange={e => setUserRoleFilter(e.target.value)}
              className="w-full bg-black/50 border border-white/10 px-4 py-3.5 rounded-2xl text-xs font-bold text-brand-yellow outline-none cursor-pointer"
            >
              <option value="All">TODOS LOS ROLES</option>
              <option value="artist">ARTISTA</option>
              <option value="fan">FAN / OYENTE</option>
              <option value="admin">ADMINISTRADOR</option>
            </select>
          </div>
        </div>

        {/* Registered Users Table */}
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest bg-black/60">
                <th className="p-4">USUARIO / CORREO</th>
                <th className="p-4">ROL ACTUAL</th>
                <th className="p-4">ESPECIALIDAD</th>
                <th className="p-4">PUNTOS / XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {artists
                .filter(u => {
                  const matchSearch = !userSearchQuery || 
                    (u.displayName || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());
                  const matchRole = userRoleFilter === 'All' || 
                    (u.role || '').toLowerCase() === userRoleFilter.toLowerCase();
                  return matchSearch && matchRole;
                })
                .map((u) => (
                  <tr key={u.id || u.uid} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img 
                        src={u.photoURL || u.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'} 
                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" 
                        alt="" 
                      />
                      <div className="min-w-0">
                        <p className="font-black italic uppercase text-white tracking-tight truncate">{u.displayName || 'Usuario RapLife'}</p>
                        <p className="text-[10px] text-gray-500 font-mono font-bold uppercase truncate">{u.email || 'Sin Correo'}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20'
                      }`}>
                        {u.role || 'Community'}
                      </span>
                    </td>

                    <td className="p-4 text-gray-300 font-medium">
                      {u.mainCategory || u.category || 'General'}
                    </td>

                    <td className="p-4 font-mono text-brand-yellow font-black">
                      {u.points || 0} PTS
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
