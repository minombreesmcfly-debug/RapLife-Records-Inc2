import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, where, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Shield, Upload, Star, Music, User, Check, X, Radio, PlayCircle, PlusCircle, Pencil, Trash, Link2, ChevronUp, ChevronDown, Save, Play, Users, Search, SlidersHorizontal, Rocket, Phone, Mail, MessageSquare, Gift, RotateCcw, Folder, Copy, Film, Video, ListVideo, SkipForward, SkipBack, ExternalLink, RefreshCw, Disc, Volume2, Pause } from 'lucide-react';
import { VideoItem, VideoPlaylistConfig } from '../types';
import IntroVideo from '../components/IntroVideo';

const AdminView = () => {
  const { user, isAdmin, loading } = useAuth();
  const { play, setRadioMode, playRadioPlaylist, currentTrack, isPlaying, togglePlay, nextTrack, radioMode } = useMusic();
  
  // Refs for hidden file inputs
  const radioFileInputRef = useRef<HTMLInputElement>(null);
  const localRadioFileInputRef = useRef<HTMLInputElement>(null);
  const localBeatFileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [artists, setArtists] = useState<any[]>([]);
  const [pendingTracks, setPendingTracks] = useState<any[]>([]);
  const [boostRequests, setBoostRequests] = useState<any[]>([]);
  const [boostFilter, setBoostFilter] = useState<'all' | 'pending' | 'contacted' | 'completed'>('all');
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [redemptionFilter, setRedemptionFilter] = useState<'all' | 'pending' | 'contacted' | 'completed'>('all');
  const [uploading, setUploading] = useState(false);
  const [radioFile, setRadioFile] = useState<File | null>(null);
  const [radioTitle, setRadioTitle] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [savingSpotify, setSavingSpotify] = useState(false);
  const [radioStatus, setRadioStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });

  // Registered Users Search & Role Management State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState<string | null>(null);

  // Sponsorships & Slides Control State
  const [globalSponsorshipsEnabled, setGlobalSponsorshipsEnabled] = useState(true);
  const [togglingSponsorUserId, setTogglingSponsorUserId] = useState<string | null>(null);

  const handleToggleGlobalSponsorships = async (enabled: boolean) => {
    setGlobalSponsorshipsEnabled(enabled);
    try {
      await setDoc(doc(db, 'config', 'sponsorships'), {
        enabled: enabled,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert(`¡Sistema global de patrocinios en slides ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}!`);
    } catch (e) {
      console.error("Error updating global sponsorships config:", e);
      alert("Error al actualizar la configuración global de patrocinios.");
    }
  };

  const handleToggleUserSponsor = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTogglingSponsorUserId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        showInSlides: newStatus,
        isSponsor: newStatus,
        updatedAt: serverTimestamp()
      });
      setArtists(prev => prev.map(u => u.id === userId ? { ...u, showInSlides: newStatus, isSponsor: newStatus } : u));
    } catch (e) {
      console.error("Error toggling user sponsor status:", e);
      alert("Error al actualizar el estado de patrocinio del usuario.");
    } finally {
      setTogglingSponsorUserId(null);
    }
  };

  const handleToggleAllSponsors = async (enableAll: boolean) => {
    
    try {
      const promises = artists.map(u => 
        updateDoc(doc(db, 'users', u.id), {
          showInSlides: enableAll,
          isSponsor: enableAll,
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setArtists(prev => prev.map(u => ({ ...u, showInSlides: enableAll, isSponsor: enableAll })));
      alert(`¡Se han ${enableAll ? 'activado' : 'desactivado'} todos los usuarios en los slides!`);
    } catch (e) {
      console.error("Error toggling all sponsors:", e);
      alert("Error al actualizar la lista completa de patrocinadores.");
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUserRoleId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        mainCategory: newRole,
        updatedAt: serverTimestamp()
      });
      setArtists(prev => prev.map(u => u.id === userId ? { ...u, role: newRole, mainCategory: newRole } : u));
    } catch (e) {
      console.error("Error updating user role:", e);
      alert("Error al actualizar el rol del usuario.");
    } finally {
      setUpdatingUserRoleId(null);
    }
  };

  // Artist form states
  const [showArtistForm, setShowArtistForm] = useState(false);
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [artistForm, setArtistForm] = useState({
    displayName: '',
    email: '',
    bio: '',
    photoURL: '',
    spotifyUrl: '',
    instagramUrl: '',
    appleMusicUrl: '',
    isPinned: false,
    isExclusive: true,
    reels: [] as string[]
  });
  const [adminFormReelInput, setAdminFormReelInput] = useState('');
  const [uploadingAdminPhoto, setUploadingAdminPhoto] = useState(false);

  const compressAndGetBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAdminPhoto(true);
    try {
      const storageRef = ref(storage, `artists/photos/admin_${Date.now()}_${file.name}`);
      const uploadPromise = uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
      const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000));
      
      let finalUrl = '';
      try {
        finalUrl = await Promise.race([uploadPromise, timeoutPromise]);
        alert('¡Imagen de perfil del artista subida al servidor con éxito!');
      } catch (uploadError) {
        console.warn("Admin storage upload failed or timed out, falling back to local optimized Base64:", uploadError);
        finalUrl = await compressAndGetBase64(file);
        alert('¡Imagen del artista optimizada y cargada localmente con éxito (modo Base64-Ultra)!');
      }

      setArtistForm(prev => ({ ...prev, photoURL: finalUrl }));
    } catch (err: any) {
      console.error(err);
      alert('Error al procesar la imagen del artista: ' + err.message);
    } finally {
      setUploadingAdminPhoto(false);
    }
  };

  // Local radio states
  const [localRadioTracks, setLocalRadioTracks] = useState<any[]>([]);
  const [uploadingLocalRadio, setUploadingLocalRadio] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('CARGANDO AUDIO...');
  const [localRadioFile, setLocalRadioFile] = useState<File | null>(null);
  const [savingRadioOrder, setSavingRadioOrder] = useState(false);
  const [refreshingPlaylist, setRefreshingPlaylist] = useState(false);

  const handleRefreshPlaylist = async () => {
    setRefreshingPlaylist(true);
    try {
      await fetchLocalRadioTracks();
      alert('¡Playlist de RapLife Radio actualizada exitosamente! Se re-escanearon todos los archivos de audio en la carpeta assets.');
    } catch (e: any) {
      console.error("Error al refrescar playlist:", e);
      alert('Error al refrescar la playlist: ' + (e.message || 'Error desconocido'));
    } finally {
      setRefreshingPlaylist(false);
    }
  };
  const [dragActive, setDragActive] = useState(false);
  const [editingTrackIndex, setEditingTrackIndex] = useState<number | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>('');

  // Dual radio support
  const [radioUploadMethod, setRadioUploadMethod] = useState<'file' | 'url'>('file');
  const [directRadioUrl, setDirectRadioUrl] = useState('');
  const [directRadioTitle, setDirectRadioTitle] = useState('');
  const [directRadioArtist, setDirectRadioArtist] = useState('');

  // ==========================================
  // Local Beats / Instrumentals States
  // ==========================================
  const [localBeatTracks, setLocalBeatTracks] = useState<any[]>([]);
  const [uploadingLocalBeat, setUploadingLocalBeat] = useState(false);
  const [beatUploadProgressText, setBeatUploadProgressText] = useState('CARGANDO BEAT...');
  const [localBeatFile, setLocalBeatFile] = useState<File | null>(null);
  const [savingBeatOrder, setSavingBeatOrder] = useState(false);
  const [refreshingBeats, setRefreshingBeats] = useState(false);
  const [dragActiveBeat, setDragActiveBeat] = useState(false);
  const [editingBeatIndex, setEditingBeatIndex] = useState<number | null>(null);
  const [editingBeatName, setEditingBeatName] = useState<string>('');
  const [beatUploadMethod, setBeatUploadMethod] = useState<'file' | 'url'>('file');
  const [directBeatUrl, setDirectBeatUrl] = useState('');
  const [directBeatTitle, setDirectBeatTitle] = useState('');
  const [directBeatArtist, setDirectBeatArtist] = useState('');
  const [directBeatBpm, setDirectBeatBpm] = useState('');
  const [beatUploadPercent, setBeatUploadPercent] = useState<number | null>(null);
  const [previewingBeatUrl, setPreviewingBeatUrl] = useState<string | null>(null);

  const handleRefreshBeats = async () => {
    setRefreshingBeats(true);
    try {
      await fetchLocalBeatTracks();
      alert('¡Catálogo de Beats & Instrumentales actualizado! Se re-escanearon todos los archivos de audio en la carpeta assets.');
    } catch (e: any) {
      console.error("Error al refrescar catálogo de beats:", e);
      alert('Error al refrescar beats: ' + (e.message || 'Error desconocido'));
    } finally {
      setRefreshingBeats(false);
    }
  };

  // Video Playlist & Display Management States
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [videoPlaybackMode, setVideoPlaybackMode] = useState<'sequential' | 'single' | 'shuffle'>('sequential');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoUploadMethod, setVideoUploadMethod] = useState<'url' | 'file'>('url');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoCategoryInput, setVideoCategoryInput] = useState('Videoclip Oficial');
  const [videoFileInput, setVideoFileInput] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingVideoConfig, setSavingVideoConfig] = useState(false);
  const [refreshingVideos, setRefreshingVideos] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideoPlaylist = async () => {
    try {
      let videos: VideoItem[] = [];
      let mode: 'sequential' | 'single' | 'shuffle' = 'sequential';
      let activeId: string | null = null;

      // 1. From Server API
      try {
        const res = await fetch('/api/video-playlist');
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (data && Array.isArray(data.videos) && data.videos.length > 0) {
              videos = data.videos;
              if (data.playbackMode) mode = data.playbackMode;
              if (data.activeVideoId) activeId = data.activeVideoId;
            }
          }
        }
      } catch (e) {
        console.warn("[ADMIN VIDEO] Video playlist API error:", e);
      }

      // 2. From Firestore
      try {
        const docSnap = await getDoc(doc(db, 'config', 'videoPlaylist'));
        if (docSnap.exists()) {
          const fsData = docSnap.data() as VideoPlaylistConfig;
          if (fsData && Array.isArray(fsData.videos) && fsData.videos.length > 0) {
            const existingUrls = new Set(videos.map(v => v.url.toLowerCase()));
            for (const v of fsData.videos) {
              if (!existingUrls.has(v.url.toLowerCase())) {
                videos.push(v);
              }
            }
            if (fsData.playbackMode) mode = fsData.playbackMode;
            if (fsData.activeVideoId) activeId = fsData.activeVideoId;
          }
        }
      } catch (e) {
        console.warn("[ADMIN VIDEO] Firestore video playlist read warning:", e);
      }

      // 3. From Local Storage
      if (videos.length === 0) {
        try {
          const cached = localStorage.getItem('raplife_video_playlist');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.videos) && parsed.videos.length > 0) {
              videos = parsed.videos;
              if (parsed.playbackMode) mode = parsed.playbackMode;
              if (parsed.activeVideoId) activeId = parsed.activeVideoId;
            }
          }
        } catch (_) {}
      }

      // 4. Scan detected videos from /api/intro-video
      try {
        const introRes = await fetch('/api/intro-video');
        if (introRes.ok) {
          const ct = introRes.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const introData = await introRes.json();
            if (introData?.allVideos && Array.isArray(introData.allVideos)) {
              const existingUrls = new Set(videos.map(v => v.url.toLowerCase()));
              for (const av of introData.allVideos) {
                if (!existingUrls.has(av.url.toLowerCase()) && !existingUrls.has(av.fallbackUrl.toLowerCase())) {
                  videos.push({
                    id: `local_${av.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    title: av.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase(),
                    url: av.url,
                    sourceType: 'local_asset',
                    fileName: av.name,
                    category: 'Assets Local'
                  });
                }
              }
            }
          }
        }
      } catch (_) {}

      // If still empty, default intro
      if (videos.length === 0) {
        videos = [{
          id: 'raplife_records_official_intro',
          title: 'RAPLIFE RECORDS — OFFICIAL INTRO DISPLAY',
          url: '/api/stream-video?file=raplife_records_intro.mp4',
          sourceType: 'local_asset',
          fileName: 'raplife_records_intro.mp4',
          category: 'Intro Oficial'
        }];
      }

      setVideoList(videos);
      setVideoPlaybackMode(mode);
      setActiveVideoId(activeId || videos[0]?.id || null);
    } catch (err) {
      console.error("Error fetching video playlist in admin:", err);
    }
  };

  const handleRefreshVideos = async () => {
    setRefreshingVideos(true);
    try {
      await fetchVideoPlaylist();
      alert('¡Lista de videos y assets actualizada con éxito!');
    } catch (e: any) {
      alert('Error al refrescar videos: ' + (e.message || 'Error desconocido'));
    } finally {
      setRefreshingVideos(false);
    }
  };

  const handleSaveVideoConfig = async (newVideos = videoList, newMode = videoPlaybackMode, newActiveId = activeVideoId) => {
    setSavingVideoConfig(true);
    try {
      const payload: VideoPlaylistConfig = {
        videos: newVideos,
        playbackMode: newMode,
        activeVideoId: newActiveId || undefined,
        updatedAt: serverTimestamp()
      };

      // 1. Save to Firestore
      try {
        await setDoc(doc(db, 'config', 'videoPlaylist'), payload, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore video playlist save warning:", fsErr);
      }

      // 2. Save to Server
      try {
        await fetch('/api/video-playlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videos: newVideos,
            playbackMode: newMode,
            activeVideoId: newActiveId
          })
        });
      } catch (srvErr) {
        console.warn("Server video-playlist API save warning:", srvErr);
      }

      // 3. Save to localStorage
      try {
        localStorage.setItem('raplife_video_playlist', JSON.stringify({
          videos: newVideos,
          playbackMode: newMode,
          activeVideoId: newActiveId
        }));
      } catch (_) {}

      alert('¡Configuración de videos y playlist guardada con éxito! La web se actualizará automáticamente.');
    } catch (err: any) {
      console.error("Error saving video playlist config:", err);
      alert('Error al guardar configuración de video: ' + err.message);
    } finally {
      setSavingVideoConfig(false);
    }
  };

  const handleAddVideoByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput || !videoUrlInput.trim()) {
      alert('Por favor ingresa una URL, enlace o nombre de archivo de video (ej: enlace MP4, WebM, Stream URL, YouTube o nombre de archivo en assets).');
      return;
    }
    if (!videoTitleInput || !videoTitleInput.trim()) {
      alert('Por favor ingresa un título descriptivo para el video.');
      return;
    }

    const rawInput = videoUrlInput.trim();
    let finalUrl = rawInput;
    let fileName: string | undefined = undefined;
    let sourceType: 'link' | 'local_asset' | 'uploaded' = 'link';

    if (!rawInput.startsWith('http://') && !rawInput.startsWith('https://')) {
      const cleanFileName = rawInput.replace(/^\/?(assets\/|video\/|public\/assets\/|dist\/assets\/|api\/stream-video\?file=)?/, '').replace(/^\/+/, '');
      finalUrl = `/api/stream-video?file=${encodeURIComponent(cleanFileName)}`;
      fileName = cleanFileName;
      sourceType = 'local_asset';
    }

    const newVideo: VideoItem = {
      id: `video_${Date.now()}`,
      title: videoTitleInput.trim(),
      url: finalUrl,
      fileName: fileName,
      sourceType: sourceType,
      category: videoCategoryInput.trim() || 'Videoclip Oficial',
      addedAt: new Date().toISOString()
    };

    const updated = [...videoList, newVideo];
    setVideoList(updated);
    setVideoUrlInput('');
    setVideoTitleInput('');
    await handleSaveVideoConfig(updated, videoPlaybackMode, activeVideoId || newVideo.id);
    alert(`¡Video "${newVideo.title}" agregado exitosamente a la playlist!`);
  };

  const handleSyncAssetsVideos = async () => {
    try {
      const res = await fetch('/api/intro-video');
      if (!res.ok) throw new Error('No se pudo consultar los videos locales.');
      const data = await res.json();
      if (!data.allVideos || data.allVideos.length === 0) {
        alert('No se encontraron nuevos archivos de video en la carpeta de assets.');
        return;
      }

      const existingUrls = new Set(videoList.map(v => v.url.toLowerCase()));
      const added: VideoItem[] = [];

      for (const av of data.allVideos) {
        if (!existingUrls.has(av.url.toLowerCase()) && !existingUrls.has(av.fallbackUrl?.toLowerCase())) {
          added.push({
            id: `local_${av.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: av.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase(),
            url: av.url,
            fileName: av.name,
            sourceType: 'local_asset',
            category: 'Assets Local',
            addedAt: new Date().toISOString()
          });
        }
      }

      if (added.length === 0) {
        alert('Todos los videos de la carpeta assets ya están en la playlist.');
        return;
      }

      const updated = [...videoList, ...added];
      setVideoList(updated);
      await handleSaveVideoConfig(updated, videoPlaybackMode, activeVideoId || updated[0].id);
      alert(`¡Se sincronizaron y agregaron ${added.length} videos encontrados en assets a la playlist!`);
    } catch (err: any) {
      console.error("Sync videos error:", err);
      alert('Error al sincronizar videos de assets: ' + err.message);
    }
  };

  const handleUploadVideoFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFileInput) {
      alert('Por favor selecciona un archivo de video (.mp4, .webm, .mov, .mkv).');
      return;
    }

    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFileInput);
      if (videoTitleInput.trim()) formData.append('title', videoTitleInput.trim());
      if (videoCategoryInput.trim()) formData.append('category', videoCategoryInput.trim());

      const res = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error en la subida del video.');
      }

      const data = await res.json();
      if (data.success && data.video) {
        const updated = [...videoList, data.video];
        setVideoList(updated);
        setVideoFileInput(null);
        setVideoTitleInput('');
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
        await handleSaveVideoConfig(updated, videoPlaybackMode, data.video.id);
        alert(`¡Video "${data.video.title}" subido con éxito y agregado a la playlist!`);
      } else {
        throw new Error('Respuesta inesperada del servidor.');
      }
    } catch (err: any) {
      console.error("Video upload error:", err);
      alert('Error al subir video: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async (item: VideoItem) => {
    if (!confirm(`¿Estás seguro de eliminar el video "${item.title}" de la playlist?`)) {
      return;
    }

    try {
      try {
        await fetch('/api/delete-video', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: item.id,
            fileName: item.fileName,
            videoUrl: item.url
          })
        });
      } catch (_) {}

      const updated = videoList.filter(v => v.id !== item.id);
      const newActive = activeVideoId === item.id ? (updated[0]?.id || null) : activeVideoId;
      setVideoList(updated);
      setActiveVideoId(newActive);
      await handleSaveVideoConfig(updated, videoPlaybackMode, newActive);
      alert('¡Video eliminado de la playlist!');
    } catch (err: any) {
      console.error("Error deleting video:", err);
      alert('Error al eliminar video: ' + err.message);
    }
  };

  const handleMoveVideo = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === videoList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...videoList];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setVideoList(reordered);
    await handleSaveVideoConfig(reordered, videoPlaybackMode, activeVideoId);
  };

  const fetchLocalRadioTracks = async () => {
    try {
      let data: any[] = [];
      try {
        const res = await fetch('/api/radio-local-songs');
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            data = await res.json();
          }
        }
      } catch (e) {
        console.warn("[ADMIN RADIO] Local radio API endpoint unavailable:", e);
      }

      // Fetch approved or legacy database tracks and map them to track items
      try {
        const tracksQ = query(collection(db, 'tracks'));
        const tracksSnap = await getDocs(tracksQ);
        const dbTracks = tracksSnap.docs
          .map(docSnap => {
            const pt = docSnap.data();
            const status = pt.status || (pt.approved ? 'approved' : 'pending');
            return {
              id: docSnap.id,
              artistId: pt.artistId || '',
              artistName: pt.artistName || 'Artista',
              title: pt.title || 'Track sin título',
              audioUrl: pt.audioUrl,
              coverUrl: pt.coverUrl || '/assets/player_idle.png',
              isRadioInterstitial: false,
              fullName: pt.title || docSnap.id,
              status
            };
          });
        
        // De-duplicate by audioUrl (case-insensitive)
        const seenUrls = new Set(data.map((t: any) => t.audioUrl.toLowerCase()));
        const filteredDbTracks = dbTracks.filter((t: any) => t.audioUrl && !seenUrls.has(t.audioUrl.toLowerCase()));
        data = [...data, ...filteredDbTracks];
      } catch (dbErr) {
        console.warn("[ADMIN RADIO] Approved/legacy db tracks fetch error:", dbErr);
      }
        
      let fileOrder: string[] = [];
      // First try to fetch from Firestore
      try {
        const docRef = doc(db, 'config', 'radioOrder');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          fileOrder = docSnap.data().fileOrder || [];
          try {
            localStorage.setItem('raplife_radio_order', JSON.stringify(fileOrder));
          } catch (_) {}
        } else {
          // Check localStorage
          const cached = localStorage.getItem('raplife_radio_order');
          if (cached) {
            fileOrder = JSON.parse(cached);
          }
        }
      } catch (err) {
        console.warn("[RADIO ADM] Firestore offline or error getting radioOrder. Using localStorage fallback:", err);
        try {
          const cached = localStorage.getItem('raplife_radio_order');
          if (cached) {
            fileOrder = JSON.parse(cached);
          }
        } catch (_) {}
      }

      if (fileOrder && fileOrder.length > 0) {
        const sorted = [...data].sort((a: any, b: any) => {
          const indexA = fileOrder.indexOf(a.fullName || a.id || '');
          const indexB = fileOrder.indexOf(b.fullName || b.id || '');
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        });
        setLocalRadioTracks(sorted);
      } else {
        setLocalRadioTracks(data);
      }
    } catch (e) {
      console.error("Error fetching local radio tracks:", e);
    }
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    const updated = [...localRadioTracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setLocalRadioTracks(updated);
  };

  const handleSaveRadioOrder = async () => {
    setSavingRadioOrder(true);
    const fileOrder = localRadioTracks.map(t => t.fullName || t.id).filter(Boolean);
    
    // Always save to localStorage immediately for fast, offline-first reliability
    try {
      localStorage.setItem('raplife_radio_order', JSON.stringify(fileOrder));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'config', 'radioOrder'), {
        fileOrder,
        updatedAt: serverTimestamp()
      });
      alert('¡Orden de reproducción guardado con éxito en la nube y localmente!');
    } catch (err: any) {
      console.warn("Soft error setting Firestore radioOrder, but saved in localStorage:", err);
      alert('¡Orden de reproducción guardado localmente en tu navegador! (El servidor de base de datos está offline transitoriamente)');
    } finally {
      setSavingRadioOrder(false);
    }
  };

  const handlePlayRadioWithOrder = async () => {
    if (localRadioTracks.length === 0) {
      alert('No hay canciones locales disponibles para reproducir.');
      return;
    }
    setSavingRadioOrder(true);
    const fileOrder = localRadioTracks.map(t => t.fullName || t.id).filter(Boolean);
    try {
      localStorage.setItem('raplife_radio_order', JSON.stringify(fileOrder));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'config', 'radioOrder'), {
        fileOrder,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Soft error saving order before playing:", err);
    } finally {
      setSavingRadioOrder(false);
    }
    const firstTrack = localRadioTracks[0];
    playRadioPlaylist(localRadioTracks, 0);
    alert(`¡Iniciando RapLife Radio en el orden de reproducción elegido! Sonando ahora: "${firstTrack.title || firstTrack.fullName}"`);
  };

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      // Fetch Artists
      let loadedArtists: any[] = [];
      try {
        const artistQ = query(collection(db, 'users'));
        const artistSnap = await getDocs(artistQ);
        loadedArtists = artistSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setArtists(loadedArtists);
      } catch (err: any) {
        if (err?.message?.includes('offline') || err?.message?.includes('Failed to get document')) {
          console.warn("[ADMIN] Loading artists: Firestore client is offline.", err);
        } else {
          console.error("Error loading artists in Admin dashboard:", err);
        }
      }

      // Pending tracks
      try {
        const trackQ = query(collection(db, 'tracks'), where('status', '==', 'pending'));
        const trackSnap = await getDocs(trackQ);
        setPendingTracks(trackSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err: any) {
        if (err?.message?.includes('offline') || err?.message?.includes('Failed to get document')) {
          console.warn("[ADMIN] Loading pending tracks: Firestore client is offline.", err);
        } else {
          console.error("Error loading pending tracks in Admin dashboard:", err);
        }
      }

      // Fetch Spotify config
      try {
        const docRef = doc(db, 'config', 'spotify');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.playlistId) {
            setSpotifyInput(`https://open.spotify.com/playlist/${data.playlistId}`);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('offline') || err?.message?.includes('Failed to get document')) {
          console.warn("[ADMIN] Spotify config load warning: Firestore client is offline.", err);
        } else {
          console.warn("[ADMIN] Error fetching spotify admin config (swallowed as warning):", err);
        }
      }

      // Fetch Global Sponsorships / Slides config
      try {
        const spRef = doc(db, 'config', 'sponsorships');
        const spSnap = await getDoc(spRef);
        if (spSnap.exists()) {
          const data = spSnap.data();
          setGlobalSponsorshipsEnabled(data.enabled !== false);
        }
      } catch (err) {
        console.warn("[ADMIN] Sponsorships config load error:", err);
      }

      // Fetch local radio tracks
      await fetchLocalRadioTracks();

      // Fetch local beats catalog
      await fetchLocalBeatTracks();

      // Fetch video playlist configuration
      await fetchVideoPlaylist();

      // Fetch Career Boost Requests
      try {
        const boostQ = query(collection(db, 'careerBoostRequests'));
        const boostSnap = await getDocs(boostQ);
        const loadedBoosts = boostSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBoostRequests(loadedBoosts);
      } catch (err) {
        console.warn("Career boost requests fetch warning:", err);
      }

      // Fetch Redemptions (Recompensas Canjeadas)
      try {
        const redQ = query(collection(db, 'redemptions'));
        const redSnap = await getDocs(redQ);
        const loadedRed = redSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedRed.sort((a: any, b: any) => new Date(b.claimedAt || b.createdAt || 0).getTime() - new Date(a.claimedAt || a.createdAt || 0).getTime());
        setRedemptions(loadedRed);
      } catch (err) {
        console.warn("Redemptions fetch warning:", err);
      }
    };
    fetchData();
  }, [isAdmin, loading]);

  const updateBoostStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'careerBoostRequests', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setBoostRequests(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (e: any) {
      console.error("Error updating boost request status:", e);
      alert("Error al actualizar estado: " + e.message);
    }
  };

  const deleteBoostRequest = async (id: string) => {
    
    try {
      await deleteDoc(doc(db, 'careerBoostRequests', id));
      setBoostRequests(prev => prev.filter(b => b.id !== id));
    } catch (e: any) {
      console.error("Error deleting boost request:", e);
      alert("Error al eliminar solicitud: " + e.message);
    }
  };

  const updateRedemptionStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'redemptions', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (e: any) {
      console.error("Error updating redemption status:", e);
      alert("Error al actualizar estado del canje: " + e.message);
    }
  };

  const deleteRedemption = async (id: string) => {
    
    try {
      await deleteDoc(doc(db, 'redemptions', id));
      setRedemptions(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      console.error("Error deleting redemption:", e);
      alert("Error al eliminar registro de canje: " + e.message);
    }
  };

  const approveTrack = async (id: string) => {
    try {
      await updateDoc(doc(db, 'tracks', id), {
        status: 'approved',
        approved: true,
        approvedAt: serverTimestamp()
      });
      setPendingTracks(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const rejectTrack = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tracks', id));
      setPendingTracks(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const togglePin = async (artistId: string, currentPin: boolean) => {
    try {
      await updateDoc(doc(db, 'users', artistId), {
        isPinned: !currentPin,
        pinnedAt: !currentPin ? serverTimestamp() : null
      });
      setArtists(prev => prev.map(a => a.id === artistId ? { ...a, isPinned: !currentPin } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistForm.displayName) {
      alert('El nombre del artista es obligatorio');
      return;
    }

    try {
      const emailValue = artistForm.email.trim() || `${artistForm.displayName.toLowerCase().replace(/\s+/g, '')}@raplife.com`;
      const photoValue = artistForm.photoURL.trim() || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';

      if (editingArtistId) {
        // Mode: EDIT
        const docRef = doc(db, 'users', editingArtistId);
        await updateDoc(docRef, {
          displayName: artistForm.displayName,
          email: emailValue,
          bio: artistForm.bio,
          photoURL: photoValue,
          spotifyUrl: artistForm.spotifyUrl,
          instagramUrl: artistForm.instagramUrl,
          appleMusicUrl: artistForm.appleMusicUrl,
          isPinned: artistForm.isPinned,
          isExclusive: artistForm.isExclusive !== false,
          reels: artistForm.reels || [],
          updatedAt: serverTimestamp()
        });
        alert('¡Perfil del artista actualizado correctamente!');
      } else {
        // Mode: CREATE
        const newArtistId = `artist-${Date.now()}`;
        const docRef = doc(db, 'users', newArtistId);
        await setDoc(docRef, {
          uid: newArtistId,
          displayName: artistForm.displayName,
          email: emailValue,
          bio: artistForm.bio,
          photoURL: photoValue,
          spotifyUrl: artistForm.spotifyUrl,
          instagramUrl: artistForm.instagramUrl,
          appleMusicUrl: artistForm.appleMusicUrl,
          role: 'artist',
          plan: 'premium',
          isPinned: artistForm.isPinned,
          isExclusive: artistForm.isExclusive !== false,
          reels: artistForm.reels || [],
          createdAt: serverTimestamp()
        });
        alert('¡Nuevo artista registrado con éxito!');
      }

      // Reset form
      setArtistForm({
        displayName: '',
        email: '',
        bio: '',
        photoURL: '',
        spotifyUrl: '',
        instagramUrl: '',
        appleMusicUrl: '',
        isPinned: false,
        isExclusive: true,
        reels: []
      });
      setAdminFormReelInput('');
      setEditingArtistId(null);
      setShowArtistForm(false);

      // Refresh list
      const artistQ = query(collection(db, 'users'));
      const artistSnap = await getDocs(artistQ);
      setArtists(artistSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleEditClick = (artist: any) => {
    setArtistForm({
      displayName: artist.displayName || '',
      email: artist.email || '',
      bio: artist.bio || '',
      photoURL: artist.photoURL || '',
      spotifyUrl: artist.spotifyUrl || '',
      instagramUrl: artist.instagramUrl || '',
      appleMusicUrl: artist.appleMusicUrl || '',
      isPinned: artist.isPinned || false,
      isExclusive: artist.isExclusive !== false,
      reels: artist.reels || []
    });
    setEditingArtistId(artist.id);
    setShowArtistForm(true);
  };

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const handleUploadLocalRadio = async () => {
    if (radioUploadMethod === 'file') {
      if (!localRadioFile) {
        alert('Por favor selecciona un archivo de audio (.mp3, .wav, .m4a)');
        return;
      }
      setUploadProgressText('PREPARANDO SUBIDA...');
      setUploadPercent(0);
      setUploadingLocalRadio(true);
      try {
        let audioUrl = '';

        // First attempt: Server API endpoint /api/upload-radio-local
        let uploadSuccess = false;
        try {
          setUploadProgressText('SUBIENDO AL SERVIDOR LOCAL...');
          setUploadPercent(20);
          const formData = new FormData();
          formData.append('track', localRadioFile);

          const response = await fetch('/api/upload-radio-local', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const resData = await response.json();
              if (resData && resData.audioUrl) {
                audioUrl = resData.audioUrl;
                uploadSuccess = true;
                setUploadPercent(80);
              }
            }
          }
        } catch (serverErr) {
          console.warn("[RADIO UPLOAD] Server proxy endpoint unavailable, switching to Firebase Storage:", serverErr);
        }

        // Fallback: Direct Firebase Storage upload if local endpoint fails or on serverless Vercel
        if (!uploadSuccess) {
          console.log("[RADIO UPLOAD] Uploading directly to Firebase Storage with resumable progress...");
          setUploadProgressText('SUBIENDO A FIREBASE STORAGE...');
          setUploadPercent(5);

          const cleanFileName = `radio_tracks/${Date.now()}_${localRadioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const storageRef = ref(storage, cleanFileName);
          
          const uploadTask = uploadBytesResumable(storageRef, localRadioFile);

          audioUrl = await new Promise<string>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              uploadTask.cancel();
              reject(new Error("La subida a Firebase Storage tardó demasiado tiempo. Verifica si tus reglas de Firebase Storage permiten escrituras sin auth o utiliza 'INYECTAR URL DIRECTA'."));
            }, 120000);

            uploadTask.on(
              'state_changed',
              (snapshot) => {
                if (snapshot.totalBytes > 0) {
                  const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 90);
                  setUploadPercent(Math.max(5, pct));
                }
              },
              (error) => {
                clearTimeout(timeoutId);
                console.error("[RADIO UPLOAD ERROR]", error);
                reject(new Error(`Error de Firebase Storage (${error.code}): ${error.message}`));
              },
              async () => {
                clearTimeout(timeoutId);
                try {
                  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  setUploadPercent(90);
                  resolve(downloadUrl);
                } catch (urlErr: any) {
                  reject(urlErr);
                }
              }
            );
          });
        }

        setUploadProgressText('REGISTRANDO TRACK EN BASE DE DATOS...');
        const addDocPromise = addDoc(collection(db, 'tracks'), {
          artistId: 'ADMIN',
          artistName: 'RAPLIFE RADIO',
          title: localRadioFile.name.replace(/\.[^/.]+$/, ""),
          audioUrl: audioUrl,
          coverUrl: '/assets/player_idle.png',
          isRadioInterstitial: false,
          approved: true,
          status: 'approved',
          createdAt: serverTimestamp()
        });
        const addDocTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout al registrar en la base de datos. Guarda nuevamente con 'Inyectar URL Directa' si persiste.")), 15000)
        );
        await Promise.race([addDocPromise, addDocTimeout]);

        setUploadPercent(100);
        alert('¡Archivo de radio subido e inyectado con éxito!');
        setLocalRadioFile(null);
        await fetchLocalRadioTracks();
      } catch (err: any) {
        console.error("Radio upload error:", err);
        alert('Error al subir: ' + (err.message || 'Error desconocido'));
      } finally {
        setUploadingLocalRadio(false);
        setUploadPercent(null);
      }
    } else {
      // URL Upload Method
      if (!directRadioUrl) {
        alert('Por favor introduce la URL directa del archivo de audio (.mp3).');
        return;
      }
      if (!directRadioTitle) {
        alert('Por favor introduce el Título del track.');
        return;
      }
      setUploadProgressText('GUARDANDO TRACK EN BASE DE DATOS...');
      setUploadingLocalRadio(true);
      try {
        await addDoc(collection(db, 'tracks'), {
          artistId: 'ADMIN',
          artistName: directRadioArtist.trim() || 'RAPLIFE RECORDS',
          title: directRadioTitle.trim(),
          audioUrl: directRadioUrl.trim(),
          coverUrl: '/assets/player_idle.png',
          isRadioInterstitial: false,
          approved: true,
          status: 'approved',
          createdAt: serverTimestamp()
        });

        alert('¡Track registrado persistentemente en la Radio con éxito!');
        setDirectRadioUrl('');
        setDirectRadioTitle('');
        setDirectRadioArtist('');
        await fetchLocalRadioTracks();
      } catch (err: any) {
        alert('Error al registrar track en base de datos: ' + err.message);
      } finally {
        setUploadingLocalRadio(false);
      }
    }
  };

  const handleDeleteLocalRadio = async (fullName: string, id?: string) => {
    // Check if it is a database-backed track or local disk file
    const isDbTrack = id && !id.startsWith('local-radio-');
    
    if (isDbTrack) {
      try {
        await deleteDoc(doc(db, 'tracks', id));
        alert('¡Track de base de datos eliminado con éxito!');
        await fetchLocalRadioTracks();
      } catch (err: any) {
        alert('Error al eliminar track de Firestore: ' + err.message);
      }
      return;
    }

    try {
      let apiSuccess = false;
      try {
        const res = await fetch('/api/delete-radio-local', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: fullName })
        });

        if (res.ok) {
          apiSuccess = true;
        }
      } catch (_) {}

      alert('¡Acción de eliminación procesada!');
      await fetchLocalRadioTracks();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleRenameLocalRadio = (idx: number, fullName: string) => {
    const extIndex = fullName.lastIndexOf('.');
    const baseSuggestion = extIndex !== -1 ? fullName.substring(0, extIndex) : fullName;
    setEditingTrackIndex(idx);
    setEditingTrackName(baseSuggestion);
  };

  const saveInlineRename = async (oldFullName: string, newBaseName: string, id?: string) => {
    if (!newBaseName || newBaseName.trim() === '') {
      alert('El nombre no puede estar vacío.');
      return;
    }

    // Check if it is a database-backed track or local disk file
    const isDbTrack = id && !oldFullName.endsWith('.mp3') && !oldFullName.endsWith('.wav') && !oldFullName.endsWith('.m4a') && !oldFullName.endsWith('.ogg');

    if (isDbTrack) {
      try {
        await updateDoc(doc(db, 'tracks', id), {
          title: newBaseName.trim()
        });
        setEditingTrackIndex(null);
        await fetchLocalRadioTracks();
        alert('¡Track de base de datos renombrado con éxito!');
      } catch (err: any) {
        alert('Error al renombrar track en Firestore: ' + err.message);
      }
      return;
    }
    
    const extIndex = oldFullName.lastIndexOf('.');
    const oldBase = extIndex !== -1 ? oldFullName.substring(0, extIndex) : oldFullName;
    if (newBaseName.trim() === oldBase) {
      setEditingTrackIndex(null);
      return;
    }

    try {
      try {
        await fetch('/api/rename-radio-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldFileName: oldFullName, newFileName: newBaseName.trim() })
        });
      } catch (_) {}

      setEditingTrackIndex(null);
      await fetchLocalRadioTracks();
    } catch (err: any) {
      alert('Error al renombrar: ' + err.message);
    }
  };

  // ==========================================
  // BEATS / INSTRUMENTALS CATALOG HANDLERS
  // ==========================================

  const fetchLocalBeatTracks = async () => {
    try {
      let data: any[] = [];
      try {
        const res = await fetch('/api/beats-local');
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            data = await res.json();
          }
        }
      } catch (e) {
        console.warn("[ADMIN BEATS] Local beats API endpoint unavailable:", e);
      }

      // Fetch approved Firestore tracks marked as beats/instrumentals
      try {
        const tracksQ = query(collection(db, 'tracks'));
        const tracksSnap = await getDocs(tracksQ);
        const dbTracks = tracksSnap.docs
          .map(docSnap => {
            const pt = docSnap.data();
            const isBeat = pt.isBeat === true || 
                           pt.genre?.toLowerCase() === 'beat' || 
                           pt.genre?.toLowerCase() === 'instrumental' || 
                           pt.type === 'beat' ||
                           pt.title?.toLowerCase().includes('beat') ||
                           pt.title?.toLowerCase().includes('instrumental');
            if (!isBeat) return null;
            return {
              id: docSnap.id,
              artistId: pt.artistId || '',
              artistName: pt.artistName || 'RAPLIFE BEATMAKER',
              title: pt.title || 'Beat Instrumental',
              audioUrl: pt.audioUrl,
              coverUrl: pt.coverUrl || '/assets/dark_brick_graffiti.jpg',
              isRadioInterstitial: false,
              isBeat: true,
              bpm: pt.bpm,
              fullName: pt.title || docSnap.id,
              source: 'cloud_db'
            };
          })
          .filter(Boolean) as any[];

        // De-duplicate by audioUrl
        const seenUrls = new Set(data.map((t: any) => t.audioUrl.toLowerCase()));
        const filteredDb = dbTracks.filter((t: any) => t.audioUrl && !seenUrls.has(t.audioUrl.toLowerCase()));
        data = [...data, ...filteredDb];
      } catch (dbErr) {
        console.warn("[ADMIN BEATS] Firestore beats query warning:", dbErr);
      }

      // Load saved order from Firestore or localStorage
      let beatOrder: string[] = [];
      try {
        const docRef = doc(db, 'config', 'beatsOrder');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          beatOrder = docSnap.data().order || [];
          try {
            localStorage.setItem('raplife_beats_order', JSON.stringify(beatOrder));
          } catch (_) {}
        } else {
          const cached = localStorage.getItem('raplife_beats_order');
          if (cached) beatOrder = JSON.parse(cached);
        }
      } catch (_) {
        try {
          const cached = localStorage.getItem('raplife_beats_order');
          if (cached) beatOrder = JSON.parse(cached);
        } catch (_) {}
      }

      if (beatOrder && beatOrder.length > 0) {
        const sorted = [...data].sort((a: any, b: any) => {
          const indexA = beatOrder.indexOf(a.fullName || a.id || '');
          const indexB = beatOrder.indexOf(b.fullName || b.id || '');
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        });
        setLocalBeatTracks(sorted);
      } else {
        setLocalBeatTracks(data);
      }
    } catch (e) {
      console.error("Error fetching local beat tracks:", e);
    }
  };

  const moveBeatTrack = (index: number, direction: 'up' | 'down') => {
    const updated = [...localBeatTracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setLocalBeatTracks(updated);
  };

  const handleSaveBeatOrder = async () => {
    setSavingBeatOrder(true);
    const order = localBeatTracks.map(t => t.fullName || t.id).filter(Boolean);
    try {
      localStorage.setItem('raplife_beats_order', JSON.stringify(order));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'config', 'beatsOrder'), {
        order,
        updatedAt: serverTimestamp()
      });
      alert('¡Orden de Beats & Instrumentales guardado con éxito!');
    } catch (err: any) {
      console.warn("Soft error setting Firestore beatsOrder, saved in localStorage:", err);
      alert('¡Orden de Beats guardado localmente!');
    } finally {
      setSavingBeatOrder(false);
    }
  };

  const handleUploadLocalBeat = async () => {
    if (beatUploadMethod === 'file') {
      if (!localBeatFile) {
        alert('Por favor selecciona o arrastra un archivo de audio para el Beat.');
        return;
      }
      setUploadingLocalBeat(true);
      setBeatUploadPercent(10);
      setBeatUploadProgressText('SUBIENDO BEAT A ASSETS/BEATS...');

      try {
        const formData = new FormData();
        formData.append('track', localBeatFile);

        const response = await fetch('/api/upload-beat-local', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al subir beat');
        }

        const result = await response.json();
        setBeatUploadPercent(75);
        setBeatUploadProgressText('SINCRONIZANDO CON BASE DE DATOS...');

        // Register in Firestore tracks
        const audioUrl = result.audioUrl || `/assets/beats/${result.fileName || localBeatFile.name}`;
        const baseTitle = localBeatFile.name.replace(/\.[^/.]+$/, "").replace(/^[Bb]eat[_-]/, '').replace(/[_-]/g, ' ').trim();
        
        try {
          await addDoc(collection(db, 'tracks'), {
            artistId: 'ADMIN',
            artistName: 'RAPLIFE PROD',
            title: baseTitle || 'Beat Instrumental',
            audioUrl: audioUrl,
            coverUrl: '/assets/dark_brick_graffiti.jpg',
            isRadioInterstitial: false,
            isBeat: true,
            genre: 'beat',
            approved: true,
            status: 'approved',
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn("Firestore sync optional warning:", dbErr);
        }

        setBeatUploadPercent(100);
        alert('¡Beat subido al catálogo e inyectado con éxito!');
        setLocalBeatFile(null);
        await fetchLocalBeatTracks();
      } catch (err: any) {
        console.error("Beat upload error:", err);
        alert('Error al subir Beat: ' + (err.message || 'Error desconocido'));
      } finally {
        setUploadingLocalBeat(false);
        setBeatUploadPercent(null);
      }
    } else {
      // URL Upload Method
      if (!directBeatUrl) {
        alert('Por favor introduce la URL directa del audio del Beat (.mp3, .wav, .ogg, etc.)');
        return;
      }
      if (!directBeatTitle) {
        alert('Por favor introduce el Título del Beat.');
        return;
      }
      setBeatUploadProgressText('GUARDANDO BEAT EN BASE DE DATOS...');
      setUploadingLocalBeat(true);
      try {
        const bpmParsed = directBeatBpm ? parseInt(directBeatBpm, 10) : undefined;
        await addDoc(collection(db, 'tracks'), {
          artistId: 'ADMIN',
          artistName: directBeatArtist.trim() || 'RAPLIFE BEATMAKER',
          title: directBeatTitle.trim(),
          audioUrl: directBeatUrl.trim(),
          coverUrl: '/assets/dark_brick_graffiti.jpg',
          isRadioInterstitial: false,
          isBeat: true,
          genre: 'beat',
          bpm: bpmParsed || undefined,
          approved: true,
          status: 'approved',
          createdAt: serverTimestamp()
        });

        alert('¡Beat registrado persistentemente en el Catálogo!');
        setDirectBeatUrl('');
        setDirectBeatTitle('');
        setDirectBeatArtist('');
        setDirectBeatBpm('');
        await fetchLocalBeatTracks();
      } catch (err: any) {
        alert('Error al registrar Beat: ' + err.message);
      } finally {
        setUploadingLocalBeat(false);
      }
    }
  };

  const handleDeleteLocalBeat = async (fullName: string, id?: string, audioUrl?: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el Beat "${fullName}"?`)) return;

    try {
      if (id && !id.startsWith('local-beat-')) {
        try {
          await deleteDoc(doc(db, 'tracks', id));
        } catch (_) {}
      }

      try {
        await fetch('/api/delete-beat-local', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: fullName, audioUrl })
        });
      } catch (_) {}

      alert('¡Beat eliminado con éxito!');
      await fetchLocalBeatTracks();
    } catch (err: any) {
      alert('Error al eliminar beat: ' + err.message);
    }
  };

  const handleRenameLocalBeat = (idx: number, fullName: string) => {
    const extIndex = fullName.lastIndexOf('.');
    const baseSuggestion = extIndex !== -1 ? fullName.substring(0, extIndex) : fullName;
    setEditingBeatIndex(idx);
    setEditingBeatName(baseSuggestion);
  };

  const saveInlineBeatRename = async (oldFullName: string, newBaseName: string, id?: string) => {
    if (!newBaseName || newBaseName.trim() === '') {
      alert('El nombre no puede estar vacío.');
      return;
    }

    const isDbTrack = id && !id.startsWith('local-beat-');
    if (isDbTrack) {
      try {
        await updateDoc(doc(db, 'tracks', id), {
          title: newBaseName.trim()
        });
        setEditingBeatIndex(null);
        await fetchLocalBeatTracks();
        alert('¡Beat renombrado con éxito!');
      } catch (err: any) {
        alert('Error al renombrar en Firestore: ' + err.message);
      }
      return;
    }

    try {
      await fetch('/api/rename-beat-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldFileName: oldFullName, newFileName: newBaseName.trim() })
      });
      setEditingBeatIndex(null);
      await fetchLocalBeatTracks();
    } catch (err: any) {
      alert('Error al renombrar: ' + err.message);
    }
  };

  const togglePreviewBeat = (audioUrl: string) => {
    if (previewingBeatUrl === audioUrl) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingBeatUrl(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      audio.onended = () => setPreviewingBeatUrl(null);
      audio.onerror = () => {
        console.warn("No se pudo reproducir la pre-escucha del beat:", audioUrl);
        setPreviewingBeatUrl(null);
      };
      audio.play().catch(() => {});
      previewAudioRef.current = audio;
      setPreviewingBeatUrl(audioUrl);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="py-20 text-center animate-pulse italic font-black uppercase text-xl text-brand-yellow">
        SINTONIZANDO ACCESO...
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="bg-red-500/10 border-2 border-red-500 p-10 rounded-3xl text-center">
        <X size={48} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">ACCESO DENEGADO</h1>
        <p className="text-gray-400 mt-2">No tienes permisos para ver esta sección.</p>
      </div>
    </div>
  );

  const handleUploadRadio = async () => {
    if (!radioFile) {
      alert('Por favor selecciona un archivo de audio (.mp3 o .wav) primero.');
      return;
    }
    if (!radioTitle) {
      alert('Por favor introduce un título para el clip en la nube.');
      return;
    }
    setUploading(true);
    setRadioStatus({ type: '', message: '' });
    try {
      let audioUrl = '';
      let apiSuccess = false;

      try {
        const formData = new FormData();
        formData.append('track', radioFile);
        formData.append('userId', 'ADMIN');
        formData.append('title', radioTitle);
        formData.append('artistName', 'RAPLIFE RADIO');

        const response = await fetch('/api/upload-track', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await response.json();
            if (data && data.audioUrl) {
              audioUrl = data.audioUrl;
              apiSuccess = true;
            }
          }
        }
      } catch (err) {
        console.warn("[ADMIN UPLOAD] API endpoint fallback to Firebase Storage:", err);
      }

      if (!apiSuccess) {
        console.log("[ADMIN UPLOAD] Uploading directly to Firebase Storage...");
        const cleanName = `radio_interstitials/${Date.now()}_${radioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storageRef = ref(storage, cleanName);
        await uploadBytes(storageRef, radioFile);
        audioUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'tracks'), {
        title: radioTitle,
        artistId: 'ADMIN',
        artistName: 'RAPLIFE RADIO',
        audioUrl: audioUrl,
        coverUrl: '/assets/player_idle.png',
        isRadioInterstitial: true,
        approved: true,
        status: 'approved',
        createdAt: serverTimestamp()
      });

      setRadioStatus({ type: 'success', message: '¡Audio/Clip inyectado en la radio con éxito!' });
      setRadioTitle('');
      setRadioFile(null);
      await fetchLocalRadioTracks();
    } catch (err: any) {
      console.error("Admin upload radio error:", err);
      setRadioStatus({ type: 'error', message: err.message || 'Error al subir el archivo.' });
    } finally {
      setUploading(false);
    }
  };

  const saveSpotifyPlaylist = async () => {
    if (!spotifyInput) return;
    setSavingSpotify(true);
    try {
      let extractedId = spotifyInput.trim();
      const playlistMatch = extractedId.match(/playlist\/([a-zA-Z0-9]+)/);
      const albumMatch = extractedId.match(/album\/([a-zA-Z0-9]+)/);
      const artistMatch = extractedId.match(/artist\/([a-zA-Z0-9]+)/);
      
      if (playlistMatch) {
         extractedId = playlistMatch[1];
      } else if (albumMatch) {
         extractedId = albumMatch[1];
      } else if (artistMatch) {
         extractedId = artistMatch[1];
      }

      await setDoc(doc(db, 'config', 'spotify'), {
        playlistId: extractedId,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || 'ADMIN'
      }, { merge: true });

      alert('¡Lista de Spotify de RapLife actualizada con éxito!');
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar: ' + e.message);
    } finally {
      setSavingSpotify(false);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row items-center gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 boombox-texture">
        <div className="p-5 bg-brand-yellow text-black rounded-3xl shadow-glow">
          <Shield size={32} />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter underline decoration-brand-yellow/30">PANEL DE CONTROL</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-1">Gesti&oacute;n maestra de RAPLIFE RECORDS INC.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left Column: Unified Radio Controls */}
        <div className="space-y-10 flex flex-col">
          {/* Card: Unified Local Radio Workspace */}
          <div className="bg-brand-dark p-8 rounded-[2rem] border-4 border-boombox-gray space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Radio size={150} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3">
                <Radio className="text-brand-yellow animate-pulse" size={26} />
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">RAPLIFE RADIO</h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const folderPath = 'public/assets/radio/';
                    navigator.clipboard.writeText(folderPath);
                    alert(`¡Ruta de carpeta copiada al portapapeles!\n\nRuta: ${folderPath}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer active:scale-95 shrink-0"
                  title="Copiar ruta absoluta/relativa de la carpeta de la radio"
                >
                  <Folder size={14} className="text-brand-yellow" />
                  <span>COPIAR PATH CARPETA</span>
                </button>

                <button
                  onClick={handleRefreshPlaylist}
                  disabled={refreshingPlaylist}
                  className="flex items-center gap-2 px-3.5 py-2 bg-brand-yellow/10 border border-brand-yellow/40 hover:bg-brand-yellow hover:text-black text-brand-yellow transition-all rounded-xl text-xs font-black uppercase shadow-glow cursor-pointer active:scale-95 shrink-0"
                  title="Actualizar playlist y re-escanear archivos de audio en la carpeta assets"
                >
                  <RotateCcw size={14} className={refreshingPlaylist ? 'animate-spin' : ''} />
                  <span>{refreshingPlaylist ? 'REFRESCANDO...' : 'REFRESCAR PLAYLIST'}</span>
                </button>
              </div>
            </div>
            
            <p className="text-gray-400 text-xs font-semibold leading-relaxed uppercase tracking-wider">
              ¡Sube canciones, promos, anuncios o intros directamente en la radio local! Alterna y acomoda el orden de reproducción como prefieras.
            </p>

            {/* Live Playback Monitor & Queue Board */}
            <div className="bg-black/80 border border-brand-yellow/30 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isPlaying ? '' : 'hidden'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-emerald-400' : 'bg-gray-650'}`}></span>
                  </span>
                  <span className="font-mono text-[9px] tracking-widest uppercase text-white font-black">
                    {radioMode ? 'SINTONIZACIÓN EN VIVO (RADIO REPLAY)' : 'MONITOR EN SILENCIO (RADIO APAGADA)'}
                  </span>
                </div>
                
                {localRadioTracks.length > 0 && (
                  <button
                    onClick={() => {
                      setRadioMode(true);
                      playRadioPlaylist(localRadioTracks, 0);
                    }}
                    className="text-[9px] font-mono font-black uppercase text-brand-yellow hover:underline cursor-pointer"
                  >
                    🚀 REINICIAR EMISIÓN
                  </button>
                )}
              </div>

              {currentTrack ? (
                <div className="flex items-center gap-4">
                  {/* Thumbnail Cover */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 shrink-0 bg-neutral-900 flex items-center justify-center">
                    {currentTrack.coverUrl ? (
                      <img referrerPolicy="no-referrer" src={currentTrack.coverUrl || "/assets/player_idle.png"} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <Music className="text-gray-600" size={20} />
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex gap-0.5 items-end h-5">
                          <span className="w-[3px] bg-brand-yellow animate-bounce" style={{ animationDuration: '0.6s' }}></span>
                          <span className="w-[3px] bg-brand-yellow animate-bounce" style={{ animationDuration: '0.9s', animationDelay: '0.15s' }}></span>
                          <span className="w-[3px] bg-brand-yellow animate-bounce" style={{ animationDuration: '0.7s', animationDelay: '0.3s' }}></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Progress details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-bold text-xs text-white truncate uppercase tracking-tighter">
                      {currentTrack.title || currentTrack.fullName}
                    </p>
                    <p className="text-[10px] text-brand-yellow truncate uppercase font-bold tracking-tight">
                      {currentTrack.artistName || 'LOCUTOR / INVITADO'}
                    </p>
                    
                    {/* Simulated visual progress bar */}
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`bg-brand-yellow h-full ${isPlaying ? 'animate-pulse' : ''}`}
                        style={{ width: isPlaying ? '60%' : '20%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">NINGÚN TEMA SINTONIZADO EN LA RADIO</p>
                  <p className="text-[9px] text-gray-650 uppercase font-medium mt-1">Presiona "Iniciar Radio" abajo para sintonizar los temas de la secuencia</p>
                </div>
              )}

              {/* Upcoming Track in Sequence */}
              {localRadioTracks.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl text-[10px] uppercase font-mono flex items-center justify-between gap-2">
                  <span className="text-gray-550 font-bold">AL AIRE SIGUIENTE:</span>
                  <span className="text-gray-300 font-black truncate max-w-[200px]">
                    {(() => {
                      const curIndex = currentTrack ? localRadioTracks.findIndex(t => t.id === currentTrack.id || (t.fullName && t.fullName === currentTrack.fullName)) : -1;
                      if (curIndex !== -1 && localRadioTracks.length > 1) {
                        const nextItem = localRadioTracks[(curIndex + 1) % localRadioTracks.length];
                        return nextItem.title || nextItem.fullName;
                      }
                      return localRadioTracks[0]?.title || localRadioTracks[0]?.fullName || 'Fin de la playlist';
                    })()}
                  </span>
                </div>
              )}

              {/* Quick Audio Controls for the Radio */}
              {currentTrack && (
                <div className="flex items-center gap-2 justify-end border-t border-white/5 pt-3">
                  <button 
                    onClick={togglePlay}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[9px] font-mono font-black uppercase text-white rounded-lg transition-all cursor-pointer"
                    title={isPlaying ? 'Pausar emisión' : 'Reanudar emisión'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-amber-400' : 'bg-brand-yellow'}`}></span>
                    {isPlaying ? 'PAUSAR RADIO' : 'PLAY RADIO'}
                  </button>

                  <button 
                    onClick={nextTrack}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-yellow hover:scale-[1.02] active:scale-95 text-[9px] text-black font-black uppercase rounded-lg transition-all cursor-pointer"
                    title="Saltar inmediato al siguiente tema"
                  >
                    <span>SALTAR CANCIÓN</span>
                    <Radio size={10} className="animate-pulse" />
                  </button>
                </div>
              )}
            </div>

            {/* Drop and Pick Upload Area */}
            <div className="space-y-4">
              <div className="p-4 bg-black/45 border border-white/5 rounded-2xl space-y-4">
                {/* Selector */}
                <div className="bg-black/40 p-1 rounded-xl flex gap-1 border border-white/5 text-[9px]">
                  <button
                    type="button"
                    onClick={() => setRadioUploadMethod('file')}
                    className={`flex-1 py-2 rounded-lg font-black uppercase transition-all tracking-wider ${radioUploadMethod === 'file' ? 'bg-brand-yellow text-black' : 'text-gray-400 hover:text-white bg-white/[0.01]'}`}
                  >
                    SUBIR ARCHIVO LOCAL (.MP3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRadioUploadMethod('url')}
                    className={`flex-1 py-2 rounded-lg font-black uppercase transition-all tracking-wider ${radioUploadMethod === 'url' ? 'bg-brand-yellow text-black' : 'text-gray-400 hover:text-white bg-white/[0.01]'}`}
                  >
                    INYECTAR URL DIRECTA (PERSISTENTE)
                  </button>
                </div>

                {radioUploadMethod === 'file' ? (
                  <>
                    <input 
                      type="file" 
                      ref={localRadioFileInputRef}
                      accept="audio/*" 
                      className="hidden"
                      onChange={e => setLocalRadioFile(e.target.files?.[0] || null)}
                    />
                    
                    <div 
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setLocalRadioFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => localRadioFileInputRef.current?.click()}
                      className={`w-full border-2 border-dashed p-6 rounded-xl flex flex-col items-center justify-center transition-all bg-white/[0.01] cursor-pointer ${
                        dragActive 
                          ? 'border-brand-yellow bg-brand-yellow/10 scale-[1.01]' 
                          : 'border-white/10 hover:border-brand-yellow/40'
                      }`}
                    >
                      <Upload size={24} className={`mb-2 transition-transform ${dragActive ? 'text-brand-yellow scale-110' : 'text-gray-650'}`} />
                      <p className="text-xs font-black uppercase text-gray-400 text-center truncate max-w-full">
                        {localRadioFile ? localRadioFile.name : 'ARRASTRA O SELECCIONA AUDIO'}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold mt-1 uppercase tracking-widest">WAV, MP3, M4A, OGG</p>
                    </div>

                    {localRadioFile && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setLocalRadioFile(null)}
                            disabled={uploadingLocalRadio}
                            className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 text-xs font-black uppercase rounded-xl transition-all cursor-pointer disabled:opacity-30"
                          >
                            <X size={14} />
                          </button>
                          <button 
                            onClick={handleUploadLocalRadio}
                            disabled={uploadingLocalRadio}
                            className="flex-1 py-3 bg-brand-yellow text-black font-black uppercase text-xs rounded-xl shadow-glow hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer relative overflow-hidden"
                          >
                            <span className="relative z-10">{uploadingLocalRadio ? `${uploadProgressText} ${uploadPercent !== null ? `(${uploadPercent}%)` : ''}` : 'SUBIR E INYECTAR DIRECTO'}</span>
                          </button>
                        </div>

                        {uploadingLocalRadio && uploadPercent !== null && (
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/10">
                            <div 
                              className="bg-brand-yellow h-full transition-all duration-300 ease-out" 
                              style={{ width: `${uploadPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block ml-1">URL DE AUDIO (.MP3 EXT.)</label>
                      <input 
                        type="url" 
                        placeholder="HTTPS://MISERVIDOR.COM/CANCION.MP3"
                        className="w-full bg-black/60 border border-white/5 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                        value={directRadioUrl}
                        onChange={e => setDirectRadioUrl(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block ml-1">TÍTULO DEL TRACK</label>
                        <input 
                          type="text" 
                          placeholder="EJ: REAL RAP LIVE"
                          className="w-full bg-black/60 border border-white/5 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                          value={directRadioTitle}
                          onChange={e => setDirectRadioTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-550 uppercase tracking-widest block ml-1">ARTISTA (OPCIONAL)</label>
                        <input 
                          type="text" 
                          placeholder="EJ: MC FLY"
                          className="w-full bg-black/60 border border-white/5 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                          value={directRadioArtist}
                          onChange={e => setDirectRadioArtist(e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleUploadLocalRadio}
                      disabled={uploadingLocalRadio || !directRadioUrl || !directRadioTitle}
                      className="w-full py-3 bg-brand-yellow text-black font-black uppercase text-xs rounded-xl shadow-glow hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale cursor-pointer"
                    >
                      {uploadingLocalRadio ? 'REGISTRANDO EN BASE DE DATOS...' : 'INYECTAR DIRECTO A LA RADIO'}
                    </button>
                  </div>
                )}
              </div>
            </div>

              {/* Sequential Playlist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black italic uppercase tracking-wider text-gray-500">
                      SECUENCIA DE REPRODUCCIÓN ({localRadioTracks.length})
                    </span>
                    <button
                      onClick={handleRefreshPlaylist}
                      disabled={refreshingPlaylist}
                      className="flex items-center gap-1 px-2 py-0.5 bg-brand-yellow/10 hover:bg-brand-yellow hover:text-black border border-brand-yellow/30 text-brand-yellow text-[9px] font-black uppercase rounded-md transition-all cursor-pointer"
                      title="Refrescar playlist y escanear archivos en assets"
                    >
                      <RotateCcw size={10} className={refreshingPlaylist ? 'animate-spin' : ''} />
                      <span>{refreshingPlaylist ? '...' : 'REFRESCAR'}</span>
                    </button>
                  </div>
                  {localRadioTracks.length > 0 && (
                    <span className="text-[9px] font-sans text-brand-yellow/60 uppercase font-mono">
                      ARRASTRA CON LAS FLECHAS PARA ORDENAR
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {localRadioTracks.map((track, idx) => {
                    const isEditing = editingTrackIndex === idx;
                    if (isEditing) {
                      return (
                        <div key={track.fullName || track.id || `local-track-${idx}`} className="flex items-center justify-between p-3 bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl text-xs transition-all gap-2">
                          <div className="flex items-center gap-2 overflow-hidden flex-grow">
                            <Music size={14} className="text-brand-yellow flex-shrink-0 animate-pulse" />
                            <div className="flex items-center gap-1.5 flex-grow">
                              <span className="text-brand-yellow font-mono text-[10px] mr-0.5">#{idx + 1}</span>
                              <input
                                type="text"
                                className="bg-black/80 border border-brand-yellow/45 text-white font-bold text-xs px-2 py-1 rounded outline-none w-full focus:border-brand-yellow"
                                value={editingTrackName}
                                onChange={(e) => setEditingTrackName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveInlineRename(track.fullName, editingTrackName, track.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingTrackIndex(null);
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => saveInlineRename(track.fullName, editingTrackName, track.id)}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded-lg transition-colors active:scale-95"
                              title="Guardar nombre"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingTrackIndex(null)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/15 rounded-lg transition-colors active:scale-95"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={track.fullName || track.id || `local-track-${idx}`} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs hover:bg-white/5 transition-all gap-2">
                        <div className="flex items-center gap-2 overflow-hidden flex-grow">
                          {/* Move Up / Down Buttons */}
                          <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
                            <button
                              onClick={() => moveTrack(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-gray-500 hover:text-brand-yellow hover:bg-white/5 disabled:opacity-10 disabled:hover:text-gray-500 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                              title="Subir posición"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => moveTrack(idx, 'down')}
                              disabled={idx === localRadioTracks.length - 1}
                              className="p-1 text-gray-500 hover:text-brand-yellow hover:bg-white/5 disabled:opacity-10 disabled:hover:text-gray-500 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                              title="Bajar posición"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              console.log("[ADMIN] Explicit play on music icon click:", track);
                              play(track);
                            }}
                            className="p-1.5 text-brand-yellow hover:text-white hover:bg-brand-yellow/20 rounded-lg transition-all cursor-pointer flex-shrink-0 active:scale-95"
                            title="Reproducir esta canción"
                          >
                            <Music size={14} />
                          </button>
                          <div className="truncate animate-fadeIn">
                            <p className="font-bold truncate text-gray-300">
                              <span className="text-brand-yellow font-mono text-[10px] mr-1.5">#{idx + 1}</span>
                              {track.title || track.fullName}
                            </p>
                            <p className="text-[9px] text-gray-550 uppercase font-mono mt-0.5">
                              {track.artistName} {track.fileSizeHuman && `• ${track.fileSizeHuman}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button 
                            onClick={() => {
                              const trackPath = track.fullName && (track.fullName.endsWith('.mp3') || track.fullName.endsWith('.wav') || track.fullName.endsWith('.m4a') || track.fullName.endsWith('.ogg'))
                                ? `public/assets/radio/${track.fullName}`
                                : (track.audioUrl || track.title || '');
                              navigator.clipboard.writeText(trackPath);
                              alert(`¡Ruta de la canción copiada al portapapeles!\n\nRuta: ${trackPath}`);
                            }}
                            className="p-2 text-gray-400 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-lg transition-colors active:scale-95 cursor-pointer"
                            title="Copiar Path de Canción"
                          >
                            <Copy size={13} />
                          </button>
                          <button 
                            onClick={() => handleRenameLocalRadio(idx, track.fullName || '')}
                            className="p-2 text-gray-400 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-lg transition-colors active:scale-95"
                            title="Cambiar nombre / Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteLocalRadio(track.fullName || '', track.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors active:scale-95"
                            title="Eliminar audio"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {localRadioTracks.length === 0 && (
                    <div className="py-12 text-center text-gray-600 border border-white/[0.03] rounded-2xl bg-black/20 text-[10px] font-black uppercase tracking-wider italic">
                      NO HAY ARCHIVOS EN LA RADIO LOCAL. ¡SUBE UNO ARRIBA!
                    </div>
                  )}
                </div>
              </div>

              {localRadioTracks.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={handleSaveRadioOrder}
                    disabled={savingRadioOrder}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 text-white hover:bg-white/15 active:scale-95 border-2 border-white/20 hover:border-white/30 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                    title="Guardar el orden personalizado actual"
                  >
                    <Save size={13} className="text-brand-yellow" />
                    {savingRadioOrder ? "GUARDANDO..." : "GUARDAR ORDEN"}
                  </button>
                  <button
                    onClick={handlePlayRadioWithOrder}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-brand-yellow text-black hover:bg-brand-yellow/90 active:scale-95 border-2 border-brand-yellow hover:border-brand-yellow/90 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-[0_4px_15px_rgba(248,251,2,0.15)] cursor-pointer"
                    title="Iniciar radio con el orden guardado"
                  >
                    <Play size={13} fill="black" />
                    INICIAR RADIO
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card: Unified Beats & Instrumentals Catalog Workspace */}
          <div className="bg-brand-dark p-8 rounded-[2rem] border-4 border-boombox-gray space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Disc size={150} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3">
                <Disc className="text-brand-yellow animate-spin" size={26} style={{ animationDuration: '6s' }} />
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">CATÁLOGO DE BEATS & INSTRUMENTALES</h2>
                  <span className="text-[10px] font-mono text-brand-yellow font-bold uppercase tracking-wider">
                    ESTUDIO VIRTUAL & COMPILACIÓN RAPLIFE
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const folderPath = 'public/assets/beats/';
                    navigator.clipboard.writeText(folderPath);
                    alert(`¡Ruta de carpeta copiada al portapapeles!\n\nRuta: ${folderPath}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer active:scale-95 shrink-0"
                  title="Copiar ruta de la carpeta de beats en assets"
                >
                  <Folder size={14} className="text-brand-yellow" />
                  <span>COPIAR PATH CARPETA</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshBeats}
                  disabled={refreshingBeats}
                  className="flex items-center gap-2 px-3.5 py-2 bg-brand-yellow/10 border border-brand-yellow/40 hover:bg-brand-yellow hover:text-black text-brand-yellow transition-all rounded-xl text-xs font-black uppercase shadow-glow cursor-pointer active:scale-95 shrink-0"
                  title="Actualizar catálogo y re-escanear archivos de audio en assets"
                >
                  <RotateCcw size={14} className={refreshingBeats ? 'animate-spin' : ''} />
                  <span>{refreshingBeats ? 'ESCANEANDO...' : 'REFRESCAR BEATS'}</span>
                </button>
              </div>
            </div>
            
            <p className="text-gray-400 text-xs font-semibold leading-relaxed uppercase tracking-wider">
              ¡Cualquier archivo de audio en <span className="text-brand-yellow">assets</span> que contenga <span className="text-white font-black">&quot;Beat&quot;</span> o esté en <span className="text-brand-yellow">assets/beats</span> se detecta y sincroniza automáticamente con el Estudio! También puedes ordenarlos o subirlos aquí.
            </p>

            {/* Live Preview Bar if audio is playing */}
            {previewingBeatUrl && (
              <div className="bg-brand-yellow/10 border-2 border-brand-yellow/50 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-brand-yellow text-black flex items-center justify-center shrink-0">
                    <Volume2 size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[9px] font-mono font-black uppercase text-brand-yellow block">PRE-ESCUCHANDO BEAT:</span>
                    <p className="text-xs font-black text-white truncate max-w-[280px]">
                      {localBeatTracks.find(b => b.audioUrl === previewingBeatUrl)?.title || previewingBeatUrl}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => togglePreviewBeat(previewingBeatUrl)}
                  className="px-3 py-1.5 bg-brand-yellow text-black text-[10px] font-black uppercase rounded-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  DETENER PREVIA
                </button>
              </div>
            )}

            {/* Card: Upload and Add Beat Form */}
            <div className="bg-black/60 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest uppercase text-white font-black">
                  AGREGAR NUEVO BEAT AL CATÁLOGO
                </span>
                <span className="text-[10px] font-mono font-black text-brand-yellow">
                  {localBeatTracks.length} BEATS DISPONIBLES
                </span>
              </div>

              {/* Mode Selector */}
              <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl text-[10px] gap-1">
                <button
                  type="button"
                  onClick={() => setBeatUploadMethod('file')}
                  className={`flex-1 py-2 rounded-lg font-black uppercase transition-all tracking-wider cursor-pointer ${beatUploadMethod === 'file' ? 'bg-brand-yellow text-black shadow-glow' : 'text-gray-400 hover:text-white bg-white/[0.01]'}`}
                >
                  SUBIR ARCHIVO LOCAL (ASSETS/BEATS)
                </button>
                <button
                  type="button"
                  onClick={() => setBeatUploadMethod('url')}
                  className={`flex-1 py-2 rounded-lg font-black uppercase transition-all tracking-wider cursor-pointer ${beatUploadMethod === 'url' ? 'bg-brand-yellow text-black shadow-glow' : 'text-gray-400 hover:text-white bg-white/[0.01]'}`}
                >
                  AGREGAR POR URL DIRECTA
                </button>
              </div>

              {beatUploadMethod === 'file' ? (
                <div className="space-y-4">
                  <input
                    ref={localBeatFileInputRef}
                    type="file"
                    accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/flac,audio/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLocalBeatFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActiveBeat(true); }}
                    onDragLeave={() => setDragActiveBeat(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveBeat(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setLocalBeatFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => localBeatFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      dragActiveBeat 
                        ? 'border-brand-yellow bg-brand-yellow/10 scale-[1.01]' 
                        : 'border-white/10 hover:border-brand-yellow/40 bg-black/40'
                    }`}
                  >
                    <Disc className={dragActiveBeat ? 'text-brand-yellow animate-spin' : 'text-gray-500'} size={32} />
                    <p className="text-xs font-black uppercase text-gray-300">
                      {localBeatFile ? localBeatFile.name : 'ARRASTRA UN BEAT O HAZ CLICK PARA SELECCIONAR'}
                    </p>
                    <p className="text-[9px] font-mono uppercase text-gray-500">
                      FORMATOS: MP3, WAV, OGG, M4A &bull; GUARDADO EN PUBLIC/ASSETS/BEATS/
                    </p>
                  </div>

                  {localBeatFile && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalBeatFile(null)}
                        disabled={uploadingLocalBeat}
                        className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 text-xs font-black uppercase rounded-xl transition-all cursor-pointer disabled:opacity-30"
                      >
                        CANCELAR
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadLocalBeat}
                        disabled={uploadingLocalBeat}
                        className="flex-1 py-3 bg-brand-yellow text-black font-black uppercase text-xs rounded-xl shadow-glow hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer relative overflow-hidden"
                      >
                        {uploadingLocalBeat ? beatUploadProgressText : 'SUBIR E INYECTAR BEAT AL ESTUDIO'}
                        {beatUploadPercent !== null && (
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-black/40 transition-all duration-300"
                            style={{ width: `${beatUploadPercent}%` }}
                          />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block ml-1">URL DE AUDIO DIRECTA (.MP3 / .WAV / CDN)</label>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/beats/trap_120bpm.mp3"
                      value={directBeatUrl}
                      onChange={(e) => setDirectBeatUrl(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block ml-1">TÍTULO DEL BEAT</label>
                      <input
                        type="text"
                        placeholder="Ej: Dark Trap Instrumental"
                        value={directBeatTitle}
                        onChange={(e) => setDirectBeatTitle(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block ml-1">BPM (OPCIONAL)</label>
                      <input
                        type="number"
                        placeholder="Ej: 120"
                        value={directBeatBpm}
                        onChange={(e) => setDirectBeatBpm(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block ml-1">PRODUCTOR / ARTISTA (OPCIONAL)</label>
                    <input
                      type="text"
                      placeholder="Ej: RAPLIFE PROD"
                      value={directBeatArtist}
                      onChange={(e) => setDirectBeatArtist(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 p-3 rounded-xl focus:border-brand-yellow outline-none text-xs text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadLocalBeat}
                    disabled={uploadingLocalBeat || !directBeatUrl || !directBeatTitle}
                    className="w-full py-3 bg-brand-yellow text-black font-black uppercase text-xs rounded-xl shadow-glow hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale cursor-pointer"
                  >
                    {uploadingLocalBeat ? beatUploadProgressText : 'REGISTRAR BEAT EN BASE DE DATOS'}
                  </button>
                </div>
              )}
            </div>

            {/* Sequence & Beat List Section */}
            <div className="bg-black/60 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black italic uppercase tracking-wider text-gray-400">
                  SECUENCIA DEL CATÁLOGO DE BEATS ({localBeatTracks.length})
                </span>
                <button
                  type="button"
                  onClick={handleRefreshBeats}
                  disabled={refreshingBeats}
                  className="flex items-center gap-1 px-2 py-0.5 bg-brand-yellow/10 hover:bg-brand-yellow hover:text-black border border-brand-yellow/30 text-brand-yellow text-[9px] font-black uppercase rounded-md transition-all cursor-pointer"
                >
                  <RotateCcw size={10} className={refreshingBeats ? 'animate-spin' : ''} />
                  <span>{refreshingBeats ? '...' : 'REFRESCAR'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {localBeatTracks.map((beat, idx) => {
                  const isEditing = editingBeatIndex === idx;
                  const isPreviewing = previewingBeatUrl === beat.audioUrl;
                  return (
                    <div 
                      key={beat.fullName || beat.id || `local-beat-${idx}`} 
                      className={`flex items-center justify-between p-3 rounded-xl text-xs transition-all gap-2 border ${
                        isPreviewing 
                          ? 'bg-brand-yellow/15 border-brand-yellow shadow-glow' 
                          : 'bg-neutral-900/80 border-white/5 hover:border-brand-yellow/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Play/Pause Preview Button */}
                        <button
                          type="button"
                          onClick={() => togglePreviewBeat(beat.audioUrl)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                            isPreviewing ? 'bg-brand-yellow text-black shadow-glow' : 'bg-white/10 hover:bg-brand-yellow hover:text-black text-white'
                          }`}
                          title={isPreviewing ? 'Pausar pre-escucha' : 'Pre-escuchar beat'}
                        >
                          {isPreviewing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </button>

                        <div className="overflow-hidden flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingBeatName}
                                onChange={(e) => setEditingBeatName(e.target.value)}
                                className="bg-black/80 border border-brand-yellow px-2 py-1 rounded text-white text-xs w-full outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveInlineBeatRename(beat.fullName || beat.fileName || '', editingBeatName, beat.id)}
                                className="px-2 py-1 bg-brand-green text-black font-black uppercase text-[9px] rounded cursor-pointer"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBeatIndex(null)}
                                className="px-2 py-1 bg-red-500/20 text-red-400 font-black uppercase text-[9px] rounded cursor-pointer"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black italic text-white truncate text-xs">
                                  {beat.title || beat.fullName}
                                </p>
                                {beat.bpm && (
                                  <span className="px-1.5 py-0.5 bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 text-[8px] font-mono font-black rounded">
                                    {beat.bpm} BPM
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 mt-0.5">
                                <span className="text-gray-400 uppercase font-bold truncate max-w-[120px]">
                                  {beat.artistName || 'RAPLIFE PROD'}
                                </span>
                                <span>&bull;</span>
                                <span className="text-brand-yellow/70 uppercase">
                                  {beat.source === 'local_asset' ? 'LOCAL ASSET' : 'CLOUD DB'}
                                </span>
                                {beat.fileSizeHuman && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{beat.fileSizeHuman}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveBeatTrack(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 active:scale-95 cursor-pointer"
                          title="Mover arriba"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBeatTrack(idx, 'down')}
                          disabled={idx === localBeatTracks.length - 1}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 active:scale-95 cursor-pointer"
                          title="Mover abajo"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenameLocalBeat(idx, beat.fullName || beat.fileName || beat.title || '')}
                          className="p-1.5 text-gray-400 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-lg transition-colors active:scale-95 cursor-pointer"
                          title="Renombrar beat"
                        >
                          <Pencil size={13} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteLocalBeat(beat.fullName || beat.fileName || '', beat.id, beat.audioUrl)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors active:scale-95 cursor-pointer"
                          title="Eliminar beat"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {localBeatTracks.length === 0 && (
                  <div className="py-12 text-center text-gray-600 border border-white/[0.03] rounded-2xl bg-black/20 text-[10px] font-black uppercase tracking-wider italic">
                    NO HAY BEATS EN LA CARPETA ASSETS. ¡SUBE UNO ARRIBA O AGREGA UN ARCHIVO CON &quot;BEAT&quot; EN EL NOMBRE!
                  </div>
                )}
              </div>

              {localBeatTracks.length > 0 && (
                <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSaveBeatOrder}
                    disabled={savingBeatOrder}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-brand-yellow text-black hover:bg-brand-yellow/90 active:scale-95 border-2 border-brand-yellow font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-glow cursor-pointer"
                    title="Guardar el orden personalizado actual para el Estudio"
                  >
                    <Save size={13} className="text-black" />
                    {savingBeatOrder ? "GUARDANDO..." : "GUARDAR ORDEN DE BEATS"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card: Video Player & Video Playlist Workspace */}
          <div className="bg-brand-dark p-8 rounded-[2rem] border-4 border-boombox-gray space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Film size={150} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3">
                <Film className="text-brand-yellow animate-pulse" size={26} />
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">REPRODUCTOR DE VIDEO & PLAYLIST</h2>
                  <span className="text-[10px] font-mono text-brand-yellow font-bold uppercase tracking-wider">
                    DISPLAY OFICIAL & SECUENCIA DE VIDEOS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const folderPath = 'public/assets/video/';
                    navigator.clipboard.writeText(folderPath);
                    alert(`¡Ruta de carpeta copiada al portapapeles!\n\nRuta: ${folderPath}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all rounded-xl text-xs font-black uppercase shadow-sm cursor-pointer active:scale-95 shrink-0"
                  title="Copiar ruta de la carpeta de videos"
                >
                  <Folder size={14} className="text-brand-yellow" />
                  <span>COPIAR PATH CARPETA</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshVideos}
                  disabled={refreshingVideos}
                  className="flex items-center gap-2 px-3.5 py-2 bg-brand-yellow/10 border border-brand-yellow/40 hover:bg-brand-yellow hover:text-black text-brand-yellow transition-all rounded-xl text-xs font-black uppercase shadow-glow cursor-pointer active:scale-95 shrink-0"
                  title="Actualizar playlist de video y escanear archivos en assets"
                >
                  <RotateCcw size={14} className={refreshingVideos ? 'animate-spin' : ''} />
                  <span>{refreshingVideos ? 'ESCANEANDO...' : 'REFRESCAR VIDEOS'}</span>
                </button>
              </div>
            </div>

            <p className="text-gray-400 text-xs font-semibold leading-relaxed uppercase tracking-wider">
              ¡Agrega videos mediante enlaces directos o sube archivos MP4/WebM a la carpeta de assets! Puedes configurar varios videos para que se reproduzcan uno tras otro de forma continua.
            </p>

            {/* Mode & Stats Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black/60 border border-white/10 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-yellow opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-yellow"></span>
                </span>
                <span className="text-[11px] font-mono font-black uppercase text-white">
                  TOTAL EN PLAYLIST: <span className="text-brand-yellow">{videoList.length} VIDEOS</span>
                </span>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">MODO:</span>
                <button
                  type="button"
                  onClick={() => {
                    const newMode = videoPlaybackMode === 'sequential' ? 'single' : 'sequential';
                    setVideoPlaybackMode(newMode);
                    handleSaveVideoConfig(videoList, newMode, activeVideoId);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    videoPlaybackMode === 'sequential'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-white/10 text-gray-300 border border-white/20'
                  }`}
                >
                  <ListVideo size={13} />
                  <span>{videoPlaybackMode === 'sequential' ? '1 TRAS OTRO (SECUENCIAL)' : 'REPETIR ACTUAL'}</span>
                </button>
              </div>
            </div>

            {/* Dual Upload / Link Method Tabs */}
            <div className="space-y-4">
              <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setVideoUploadMethod('url')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    videoUploadMethod === 'url'
                      ? 'bg-brand-yellow text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Link2 size={15} />
                  <span>AGREGAR POR LINK / URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoUploadMethod('file')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    videoUploadMethod === 'file'
                      ? 'bg-brand-yellow text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload size={15} />
                  <span>SUBIR ARCHIVO DE VIDEO</span>
                </button>
              </div>

              {/* Form: Link/URL */}
              {videoUploadMethod === 'url' && (
                <form onSubmit={handleAddVideoByUrl} className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Título del Video *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Videoclip Oficial RapLife - Freestyle 2025"
                        value={videoTitleInput}
                        onChange={e => setVideoTitleInput(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-white focus:border-brand-yellow outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        URL o Nombre del Archivo en Assets (MP4, YouTube, CDN, WebM) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: raplife_records_intro.mp4  o  https://www.youtube.com/watch?v=...  o  https://cdn.example.com/video.mp4"
                        value={videoUrlInput}
                        onChange={e => setVideoUrlInput(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-white focus:border-brand-yellow outline-none font-mono"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">
                        💡 Puedes pegar enlaces de YouTube, URLs de streaming o el nombre del archivo ubicado en <span className="text-brand-yellow">public/assets</span>.
                      </p>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        Categoría / Etiqueta
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Videoclip Oficial, Intro, Promo, Live Session"
                        value={videoCategoryInput}
                        onChange={e => setVideoCategoryInput(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-white focus:border-brand-yellow outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      disabled={savingVideoConfig}
                      className="flex-1 py-3.5 bg-brand-yellow hover:bg-brand-yellow/90 text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-glow active:scale-98"
                    >
                      <PlusCircle size={16} />
                      <span>AGREGAR VIDEO A LA PLAYLIST</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncAssetsVideos}
                      className="py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 active:scale-98"
                      title="Escanear y agregar automáticamente videos subidos a public/assets"
                    >
                      <RefreshCw size={15} className="text-brand-yellow" />
                      <span className="hidden sm:inline">SINCRONIZAR ASSETS</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Form: File Upload */}
              {videoUploadMethod === 'file' && (
                <form onSubmit={handleUploadVideoFile} className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                      Título del Video (Opcional - se usa nombre del archivo por defecto)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Intro Oficial 4K"
                      value={videoTitleInput}
                      onChange={e => setVideoTitleInput(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-white focus:border-brand-yellow outline-none font-bold mb-3"
                    />
                  </div>

                  {/* Dropzone / file selector */}
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setVideoFileInput(e.target.files[0]);
                        if (!videoTitleInput) {
                          setVideoTitleInput(e.target.files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' '));
                        }
                      }
                    }}
                    className="hidden"
                  />

                  <div
                    onClick={() => videoFileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-brand-yellow/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-black/40 hover:bg-black/60 group/drop flex flex-col items-center justify-center space-y-2"
                  >
                    <Film className="text-gray-400 group-hover/drop:text-brand-yellow transition-colors" size={32} />
                    <p className="text-xs font-bold text-white uppercase">
                      {videoFileInput ? `Archivo seleccionado: ${videoFileInput.name}` : 'Haz clic para seleccionar un archivo de video'}
                    </p>
                    <p className="text-[10px] font-mono text-gray-400">
                      Formatos admitidos: MP4, WebM, MOV, MKV (Se guardará en /assets/video/)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingVideo || !videoFileInput}
                    className={`w-full py-3.5 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      uploadingVideo || !videoFileInput
                        ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                        : 'bg-brand-yellow hover:bg-brand-yellow/90 text-black shadow-glow active:scale-98'
                    }`}
                  >
                    <Upload size={16} />
                    <span>{uploadingVideo ? 'SUBIENDO Y PROCESANDO VIDEO...' : 'SUBIR E INCLUIR EN PLAYLIST'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Current Playlist Items Sequence List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-gray-400 flex items-center gap-1.5">
                  <ListVideo size={14} className="text-brand-yellow" />
                  <span>VIDEOS CONFIGURADOS ({videoList.length})</span>
                </span>

                {videoList.length > 1 && (
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                    ⚡ MODO: REPRODUCIENDO UNO TRAS OTRO
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {videoList.length > 0 ? (
                  videoList.map((item, idx) => {
                    const isActive = activeVideoId === item.id || (!activeVideoId && idx === 0);
                    return (
                      <div
                        key={item.id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-neutral-900/90 border-brand-yellow/60 shadow-[0_0_15px_rgba(248,251,2,0.15)]'
                            : 'bg-black/60 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-black/80 border border-white/10 flex items-center justify-center font-mono text-[10px] font-black text-brand-yellow shrink-0">
                            {idx + 1}
                          </span>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-white truncate uppercase tracking-tight">
                                {item.title}
                              </p>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded bg-brand-yellow text-black text-[8px] font-black uppercase shrink-0">
                                  ACTIVO
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-[9px] font-mono text-gray-400">
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                                {item.sourceType === 'link' ? '🔗 URL Link' : '📁 Archivo Local'}
                              </span>
                              {item.category && (
                                <span className="text-brand-yellow font-semibold">
                                  • {item.category}
                                </span>
                              )}
                              <span className="truncate max-w-[200px] text-gray-500">
                                {item.url}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            onClick={() => handleMoveVideo(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-300 hover:text-white cursor-pointer transition-all"
                            title="Subir en la playlist"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveVideo(idx, 'down')}
                            disabled={idx === videoList.length - 1}
                            className="p-1.5 bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-300 hover:text-white cursor-pointer transition-all"
                            title="Bajar en la playlist"
                          >
                            <ChevronDown size={14} />
                          </button>

                          {/* Set as Active */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveVideoId(item.id);
                              handleSaveVideoConfig(videoList, videoPlaybackMode, item.id);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                              isActive
                                ? 'bg-brand-yellow text-black'
                                : 'bg-white/10 hover:bg-white/20 text-gray-300'
                            }`}
                            title="Reproducir ahora como video activo"
                          >
                            {isActive ? 'REPRODUCIENDO' : 'ACTIVAR'}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(item)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg cursor-pointer transition-all"
                            title="Eliminar de la playlist"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-500 font-mono text-xs uppercase bg-black/30 rounded-2xl border border-white/5">
                    NO HAY VIDEOS EN LA PLAYLIST. ¡AGREGA UNO ARRIBA!
                  </div>
                )}
              </div>
            </div>

            {/* Mini Monitor / Live Preview for Testing Video Playback */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-brand-yellow flex items-center gap-1.5">
                  <Film size={14} className="text-brand-yellow" />
                  <span>MONITOR DE PRUEBA EN PEQUEÑO (TESTING DASHBOARD)</span>
                </span>
                <span className="text-[9px] font-mono text-gray-400">
                  Haz clic para activar/silenciar audio
                </span>
              </div>
              <IntroVideo compact={true} />
            </div>

            {/* Bottom Save & Actions */}
            <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSaveVideoConfig()}
                disabled={savingVideoConfig}
                className="flex-1 py-3 px-4 bg-brand-yellow hover:bg-brand-yellow/90 text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow cursor-pointer active:scale-98"
              >
                <Save size={14} />
                <span>{savingVideoConfig ? 'GUARDANDO CAMBIOS...' : 'GUARDAR PLAYLIST Y ORDEN'}</span>
              </button>
            </div>
          </div>

        {/* Right Column: Artist Management */}
        <div className="bg-brand-dark p-8 rounded-[2rem] border-4 border-boombox-gray space-y-6 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <User className="text-brand-yellow" size={24} />
              <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-white/10">GESTIÓN DE ARTISTAS</h2>
            </div>
            
            <button 
              onClick={() => {
                setEditingArtistId(null);
                setArtistForm({
                  displayName: '',
                  email: '',
                  bio: '',
                  photoURL: '',
                  spotifyUrl: '',
                  instagramUrl: '',
                  appleMusicUrl: '',
                  isPinned: false,
                  isExclusive: false,
                  reels: []
                });
                setShowArtistForm(!showArtistForm);
              }}
              className="px-4 py-2 bg-brand-yellow hover:bg-brand-yellow hover:scale-[1.03] text-black font-black uppercase text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95"
            >
              {showArtistForm && !editingArtistId ? (
                <> <X size={14} /> CANCELAR </>
              ) : (
                <> <PlusCircle size={14} /> REGISTRAR <span className="hidden sm:inline">ARTISTA</span> </>
              )}
            </button>
          </div>

          {/* Form wrapper */}
          {showArtistForm && (
            <form onSubmit={handleSaveArtist} className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-black italic uppercase tracking-wider text-brand-yellow">
                {editingArtistId ? '✏️ EDITAR PERFIL DE ARTISTA' : '➕ REGISTRAR ARTISTA DIRECTO'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Nombre del Artista *</label>
                  <input 
                    type="text" required placeholder="Ej: Travis Scott"
                    className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs focus:border-brand-yellow outline-none transition-all font-bold"
                    value={artistForm.displayName}
                    onChange={e => setArtistForm({...artistForm, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Email (Opcional)</label>
                  <input 
                    type="email" placeholder="Ej: artista@raplife.com"
                    className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs focus:border-brand-yellow outline-none transition-all font-bold"
                    value={artistForm.email}
                    onChange={e => setArtistForm({...artistForm, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-left block">Imagen de Perfil</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" placeholder="Ej: https://images.unsplash.com/... o sube un archivo"
                    className="flex-grow bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs focus:border-brand-yellow outline-none transition-all font-bold text-white bg-neutral-900"
                    value={artistForm.photoURL}
                    onChange={e => setArtistForm({...artistForm, photoURL: e.target.value})}
                  />
                  <label className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase rounded-xl cursor-pointer flex items-center gap-1.5 transition-all">
                    <Upload size={12} />
                    {uploadingAdminPhoto ? 'SUBIENDO...' : 'SUBIR FOTO'}
                    <input 
                      type="file" accept="image/*" className="hidden"
                      onChange={handleAdminPhotoUpload} disabled={uploadingAdminPhoto}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-left block">Biografía o Slogan</label>
                <textarea 
                  placeholder="Escribe la biografía del artista..." rows={2}
                  className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs focus:border-brand-yellow outline-none transition-all font-bold"
                  value={artistForm.bio}
                  onChange={e => setArtistForm({...artistForm, bio: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-left block">Spotify URL</label>
                  <input 
                    type="text" placeholder="https://open.spotify.com/artist/..."
                    className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] focus:border-brand-yellow outline-none transition-all font-bold"
                    value={artistForm.spotifyUrl}
                    onChange={e => setArtistForm({...artistForm, spotifyUrl: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-left block">Instagram URL</label>
                  <input 
                    type="text" placeholder="https://instagram.com/..."
                    className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] focus:border-brand-yellow outline-none transition-all font-bold"
                    value={artistForm.instagramUrl}
                    onChange={e => setArtistForm({...artistForm, instagramUrl: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-left block">Apple Music URL</label>
                  <input 
                    type="text" placeholder="https://music.apple.com/..."
                    className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] focus:border-brand-yellow outline-none transition-all font-bold"
                    value={artistForm.appleMusicUrl}
                    onChange={e => setArtistForm({...artistForm, appleMusicUrl: e.target.value})}
                  />
                </div>
              </div>

              {/* REELS SECTION FOR ADMIN */}
              <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-brand-yellow uppercase tracking-widest">REELS / VIDEOCLIPS</label>
                  <span className="text-[8px] font-mono font-bold text-gray-500">{(artistForm.reels || []).length} CARGADOS</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="Ej: https://www.youtube.com/shorts/VIDEO_ID"
                    className="flex-grow bg-black/50 border border-white/10 p-3 rounded-lg text-[10px] focus:border-brand-yellow outline-none transition-all font-bold"
                    value={adminFormReelInput}
                    onChange={e => setAdminFormReelInput(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (adminFormReelInput.trim()) {
                        const updatedReels = [...(artistForm.reels || []), adminFormReelInput.trim()];
                        setArtistForm({ ...artistForm, reels: updatedReels });
                        setAdminFormReelInput('');
                      }
                    }}
                    className="px-4 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:scale-[1.01] active:scale-95 transition-all text-center"
                  >
                    AGREGAR
                  </button>
                </div>
                <div className="space-y-1 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar text-[10px]">
                  {(artistForm.reels || []).map((url, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/[0.01] p-2 rounded border border-white/5 text-[10px]">
                      <span className="truncate flex-1 font-mono text-gray-400 mr-2">{url}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const updatedReels = (artistForm.reels || []).filter((_, idx) => idx !== i);
                          setArtistForm({ ...artistForm, reels: updatedReels });
                        }}
                        className="text-gray-500 hover:text-red-500 p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" id="artist-pin"
                    className="rounded bg-black border-white/10 text-brand-yellow focus:ring-brand-yellow"
                    checked={artistForm.isPinned}
                    onChange={e => setArtistForm({...artistForm, isPinned: e.target.checked})}
                  />
                  <label htmlFor="artist-pin" className="text-[11px] font-black uppercase text-gray-400 cursor-pointer">Fijar destacado (PIN)</label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" id="artist-exclusive"
                    className="rounded bg-black border-white/10 text-brand-yellow focus:ring-brand-yellow"
                    checked={artistForm.isExclusive !== false}
                    onChange={e => setArtistForm({...artistForm, isExclusive: e.target.checked})}
                  />
                  <label htmlFor="artist-exclusive" className="text-[11px] font-black uppercase text-gray-400 cursor-pointer">Artista Exclusivo RapLife</label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-brand-yellow text-black font-black uppercase text-xs rounded-xl hover:scale-[1.01] transition-all"
                >
                  {editingArtistId ? 'GUARDAR PERFIL' : 'REGISTRAR ARTISTA'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingArtistId(null);
                    setShowArtistForm(false);
                  }}
                  className="px-4 py-3 bg-white/5 text-white font-black uppercase text-xs rounded-xl hover:bg-white/10 transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          )}
          
          <div className="flex-1 max-h-[480px] overflow-y-auto space-y-4 pr-3 scrollbar-hide">
            {artists.filter(a => a.role === 'artist').map(artist => (
              <div key={artist.id} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                   <div className="relative">
                     <img src={artist.photoURL || 'https://via.placeholder.com/150'} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:border-brand-yellow transition-colors" />
                     {artist.isPinned && <div className="absolute -top-2 -right-2 w-5 h-5 bg-brand-yellow rounded-full flex items-center justify-center text-black border-2 border-brand-dark"><Star size={10} fill="black" /></div>}
                   </div>
                   <div>
                     <p className="font-black italic uppercase tracking-tighter text-lg">{artist.displayName}</p>
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{artist.email || 'Sin Correo'}</p>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditClick(artist)}
                    className="p-3 rounded-xl bg-white/5 hover:bg-brand-yellow hover:text-black text-gray-400 transition-all active:scale-95"
                    title="Editar Perfil"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => togglePin(artist.id, artist.isPinned)}
                    className={`p-3 rounded-xl transition-all shadow-lg active:scale-90 ${artist.isPinned ? 'bg-brand-yellow text-black' : 'bg-black/50 text-gray-600 hover:text-white border border-white/5'}`}
                    title={artist.isPinned ? 'Quitar Pin' : 'Hacer Pin'}
                  >
                    <Star size={16} fill={artist.isPinned ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            ))}
            {artists.filter(a => a.role === 'artist').length === 0 && (
              <div className="py-20 text-center opacity-30 italic font-black uppercase tracking-widest text-sm">SIN ARTISTAS REGISTRADOS</div>
            )}
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
            <span className="px-4 py-2 bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl text-brand-yellow font-black italic text-sm">
              TOTAL: {artists.length} USUARIOS
            </span>
          </div>
        </div>

        {/* SPONSORSHIPS & SLIDES MASTER CONTROL CARD */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border-2 border-brand-yellow/40 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Star className="text-brand-yellow animate-pulse shrink-0" size={24} />
              <div>
                <h3 className="text-lg font-black italic uppercase text-white tracking-tight">CONTROL MAESTRO DE PATROCINIOS Y SLIDES DEL REPRODUCTOR</h3>
                <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                  Activa o desactiva la aparición de cuentas de patrocinadores y usuarios en los slides superiores de la web.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleToggleGlobalSponsorships(!globalSponsorshipsEnabled)}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase transition-all shadow-md cursor-pointer ${
                  globalSponsorshipsEnabled 
                    ? 'bg-brand-yellow text-black hover:bg-yellow-400' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                PATROCINIOS EN SLIDES: {globalSponsorshipsEnabled ? 'ACTIVADOS ★' : 'DESACTIVADOS ✕'}
              </button>

              <button
                onClick={() => handleToggleAllSponsors(true)}
                className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase transition-all cursor-pointer"
                title="Activar todos en los slides"
              >
                ACTIVAR TODOS
              </button>

              <button
                onClick={() => handleToggleAllSponsors(false)}
                className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 rounded-xl font-black text-[10px] uppercase transition-all cursor-pointer"
                title="Desactivar todos de los slides"
              >
                DESACTIVAR TODOS
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-gray-400 pt-1 border-t border-white/5">
            <span className="text-brand-yellow font-black">
              ★ {artists.filter(u => u.showInSlides === true || u.isSponsor === true).length} PATROCINADORES VISIBLES EN SLIDES
            </span>
            <span>•</span>
            <span>{artists.filter(u => u.showInSlides === false || u.isSponsor === false).length} CUENTAS OCULTAS</span>
          </div>
        </div>

        {/* Search & Role Category Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo o id de usuario..."
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
              <option value="Artista">ARTISTA</option>
              <option value="Creator">CREATOR</option>
              <option value="Modelo">MODELO</option>
              <option value="Productor">PRODUCTOR</option>
              <option value="Creativo">CREATIVO</option>
              <option value="Hustler">HUSTLER</option>
              <option value="Community">COMMUNITY / FAN</option>
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
                <th className="p-4">PATROCINIO / SLIDES</th>
                <th className="p-4">ESPECIALIDAD</th>
                <th className="p-4">NIVEL / XP</th>
                <th className="p-4">PUNTOS</th>
                <th className="p-4 text-right">ASIGNAR ROL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {artists
                .filter(u => {
                  const matchSearch = !userSearchQuery || 
                    (u.displayName || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());
                  const matchRole = userRoleFilter === 'All' || 
                    (u.role || '').toLowerCase() === userRoleFilter.toLowerCase() ||
                    (u.mainCategory || '').toLowerCase() === userRoleFilter.toLowerCase();
                  return matchSearch && matchRole;
                })
                .map((u) => {
                  const currentRole = u.mainCategory || u.role || 'Community';
                  const isSponsorActive = u.showInSlides === true || u.isSponsor === true;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
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
                          currentRole === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20'
                        }`}>
                          {currentRole}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          disabled={togglingSponsorUserId === u.id}
                          onClick={() => handleToggleUserSponsor(u.id, isSponsorActive)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[9px] font-black uppercase transition-all cursor-pointer ${
                            isSponsorActive 
                              ? 'bg-yellow-500/20 text-brand-yellow border border-yellow-500/40 hover:bg-yellow-500/30 shadow-glow' 
                              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                          }`}
                          title="Alternar visibilidad en los slides superiores"
                        >
                          <Star size={12} className={isSponsorActive ? 'fill-brand-yellow text-brand-yellow' : ''} />
                          <span>{isSponsorActive ? '★ EN SLIDES' : '☆ OCULTO'}</span>
                        </button>
                      </td>

                      <td className="p-4 text-gray-400 font-bold uppercase text-[10px]">
                        {u.specialty || u.genre || 'General'}
                      </td>

                      <td className="p-4 font-mono font-black text-brand-green">
                        Lvl {Math.floor((u.xp || 150) / 500) + 1} ({u.xp || 150} XP)
                      </td>

                      <td className="p-4 font-mono text-gray-300 font-bold">
                        {(u.points || 0).toLocaleString()} PTS
                      </td>

                      <td className="p-4 text-right">
                        <select
                          disabled={updatingUserRoleId === u.id}
                          value={u.role || u.mainCategory || 'artist'}
                          onChange={e => handleUpdateUserRole(u.id, e.target.value)}
                          className="bg-neutral-900 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-white outline-none cursor-pointer hover:border-brand-yellow transition-all"
                        >
                          <option value="artist">Artista</option>
                          <option value="Creator">Creator</option>
                          <option value="Modelo">Modelo</option>
                          <option value="Productor">Productor</option>
                          <option value="Creativo">Creativo</option>
                          <option value="Hustler">Hustler</option>
                          <option value="Community">Community / Fan</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              {artists.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 italic uppercase font-bold text-xs">
                    Cargando usuarios registrados...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SPOTIFY PLAYLIST MASTER CONTROL CARD */}
      <div className="bg-brand-dark p-8 rounded-[2.5rem] border-4 border-boombox-gray relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Radio size={120} />
         </div>
         <div className="flex flex-col md:flex-row md:items-center gap-6 relative">
            <div className="p-3 bg-brand-yellow/10 rounded-2xl text-brand-yellow self-start">
               <Radio size={28} />
            </div>
            <div className="flex-1">
               <h2 className="text-2xl font-black italic uppercase tracking-tighter">PLAYLIST OFICIAL DE SPOTIFY (VINILO DIGITAL)</h2>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Sintonizador maestro de RapLife Records Inc.</p>
               <p className="text-gray-500 text-xs font-medium leading-relaxed mt-2 max-w-2xl">
                 Ingresa el enlace o ID de tu playlist de Spotify. La web lo detectará automáticamente, actualizará el reproductor del Vinilo Digital en vivo para todos tus fans, y lo mantendrá sincronizado.
               </p>
            </div>
         </div>

         <div className="mt-6 flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Ej: https://open.spotify.com/playlist/37i9dQZF1DX186v5A68pAI" 
              className="flex-grow bg-black/50 border border-white/10 p-5 rounded-2xl focus:border-brand-yellow outline-none transition-all font-bold text-sm"
              value={spotifyInput} 
              onChange={e => setSpotifyInput(e.target.value)}
            />
            <button 
              onClick={saveSpotifyPlaylist}
              disabled={savingSpotify || !spotifyInput}
              className="py-5 px-10 bg-brand-yellow text-black font-black italic uppercase text-sm rounded-2xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale md:w-auto w-full"
            >
              {savingSpotify ? 'GUARDANDO...' : 'ACTUALIZAR SPOTIFY'}
            </button>
         </div>
      </div>

      {/* TRACK MODERATION SECTION */}
      <div className="bg-brand-dark p-8 rounded-[2.5rem] border-4 border-boombox-gray space-y-8 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-yellow/10 rounded-2xl text-brand-yellow">
            <Radio size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">MODERACIÓN DE TRACKS</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">PENDIENTES DE APROBACIÓN PARA LA RADIO</p>
          </div>
          <div className="px-4 py-2 bg-brand-yellow/10 rounded-xl border border-brand-yellow/20">
            <span className="text-brand-yellow font-black italic text-xl">{pendingTracks.length}</span>
            <span className="text-gray-500 font-black uppercase text-[10px] ml-2">PENDIENTES</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingTracks.map(track => (
            <div key={track.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 hover:border-brand-yellow/40 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-black overflow-hidden border border-white/5 relative group-hover:scale-105 transition-transform">
                  <img src={track.coverUrl} className="w-full h-full object-cover opacity-60" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-black italic uppercase tracking-tighter text-lg truncate">{track.title}</p>
                  <p className="text-[10px] text-brand-yellow font-bold uppercase tracking-widest truncate">{track.artistName}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => approveTrack(track.id)}
                  className="flex-1 bg-brand-green/20 text-brand-green border border-brand-green/20 py-3 rounded-xl font-black italic uppercase text-xs hover:bg-brand-green hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <Check size={16} /> APROBAR
                </button>
                <button 
                  onClick={() => rejectTrack(track.id)}
                  className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-xl font-black italic uppercase text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <X size={16} /> RECHAZAR
                </button>
              </div>
            </div>
          ))}
          {pendingTracks.length === 0 && (
            <div className="col-span-full py-20 bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-center opacity-30">
               <Music size={48} />
               <p className="font-black italic uppercase tracking-widest text-sm">LIMPIEZA TOTAL EN LA COLA DE REVISIÓN</p>
            </div>
          )}
        </div>
      </div>

      {/* CAREER BOOST REQUESTS INBOX (SOLICITUDES DE IMPULSO) */}
      <div className="bg-brand-dark p-8 rounded-[2.5rem] border-4 border-brand-yellow space-y-8 relative overflow-hidden text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
              <Rocket size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                SOLICITUDES DE IMPULSO DE CARRERA
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-0.5">
                Bandeja de entrada de peticiones de servicios, producción y asesoría desde el Ecosistema
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'contacted', 'completed'] as const).map(statusKey => (
              <button
                key={statusKey}
                onClick={() => setBoostFilter(statusKey)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${
                  boostFilter === statusKey ? 'bg-brand-yellow text-black' : 'bg-black/50 text-gray-400 hover:text-white'
                }`}
              >
                {statusKey === 'all' ? 'TODAS' : statusKey === 'pending' ? 'PENDIENTES ⌛' : statusKey === 'contacted' ? 'CONTACTADOS 📲' : 'COMPLETADOS ✓'}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {boostRequests
            .filter(b => boostFilter === 'all' || b.status === boostFilter)
            .map(req => (
              <div 
                key={req.id}
                className="bg-neutral-900 border-2 border-white/10 p-6 rounded-3xl space-y-4 hover:border-brand-yellow/40 transition-all text-left"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow rounded-2xl font-black text-sm uppercase">
                      {req.userCategory || 'Talento'}
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase text-white leading-tight">
                        {req.userName || 'Usuario RapLife'}
                      </h3>
                      <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                        {req.userEmail} • {req.userSpecialty || 'Especialidad'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Select */}
                    <select
                      value={req.status || 'pending'}
                      onChange={e => updateBoostStatus(req.id, e.target.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase outline-none cursor-pointer border ${
                        req.status === 'completed' 
                          ? 'bg-brand-green/20 text-brand-green border-brand-green/40' 
                          : req.status === 'contacted' 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      <option value="pending" className="bg-neutral-900 text-amber-400">PENDIENTE ⌛</option>
                      <option value="contacted" className="bg-neutral-900 text-blue-400">CONTACTADO 📲</option>
                      <option value="completed" className="bg-neutral-900 text-brand-green">COMPLETADO ✓</option>
                    </select>

                    <button
                      onClick={() => deleteBoostRequest(req.id)}
                      className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      title="Eliminar solicitud"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Contact & Services details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  <div className="md:col-span-5 space-y-2 bg-black/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-mono font-black text-brand-yellow uppercase tracking-widest block">
                      DATOS DE CONTACTO
                    </span>
                    <p className="font-mono text-white font-bold flex items-center gap-2">
                      <Phone size={14} className="text-brand-yellow" />
                      <span>{req.phone || 'Sin WhatsApp'}</span>
                    </p>
                    {req.message && (
                      <p className="text-gray-300 font-medium italic mt-2 border-t border-white/5 pt-2">
                        "{req.message}"
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-7 space-y-2 bg-black/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-mono font-black text-brand-yellow uppercase tracking-widest block">
                      SERVICIOS DE IMPULSO SOLICITADOS
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(req.services || []).map((serv: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase">
                          {serv}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            ))}

          {boostRequests.length === 0 && (
            <div className="py-16 text-center text-gray-500 italic font-black uppercase text-xs">
              NO HAY SOLICITUDES DE IMPULSO DE CARRERA REGISTRADAS
            </div>
          )}
        </div>
      </div>

      {/* REDEMPTIONS & NOTIFICATIONS SECTION (CANJES DE RECOMPENSAS CON PUNTOS) */}
      <div className="bg-brand-dark p-8 rounded-[2.5rem] border-4 border-brand-yellow space-y-8 relative overflow-hidden text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
              <Gift size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                CANJES DE RECOMPENSAS / NOTIFICACIONES
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-0.5">
                Bandeja de entrada de canjes con puntos RapLife (Cameos, Videos Musicales, Menciones)
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'contacted', 'completed'] as const).map(statusKey => (
              <button
                key={statusKey}
                onClick={() => setRedemptionFilter(statusKey)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${
                  redemptionFilter === statusKey ? 'bg-brand-yellow text-black' : 'bg-black/50 text-gray-400 hover:text-white'
                }`}
              >
                {statusKey === 'all' ? 'TODAS' : statusKey === 'pending' ? 'PENDIENTES ⌛' : statusKey === 'contacted' ? 'CONTACTADOS 📲' : 'ENTREGADOS ✓'}
              </button>
            ))}
          </div>
        </div>

        {/* Redemptions List */}
        <div className="space-y-4">
          {redemptions
            .filter(r => redemptionFilter === 'all' || r.status === redemptionFilter)
            .map(red => (
              <div 
                key={red.id}
                className="bg-neutral-900 border-2 border-brand-yellow/30 p-6 rounded-3xl space-y-4 hover:border-brand-yellow transition-all text-left"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow rounded-2xl font-black text-sm uppercase font-mono">
                      {red.pointsSpent ? `${red.pointsSpent.toLocaleString()} PTS` : 'CANJE'}
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase text-white leading-tight">
                        {red.rewardTitle || 'Recompensa Canjeada'}
                      </h3>
                      <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                        {red.userDisplayName} • {red.userEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Select */}
                    <select
                      value={red.status || 'pending'}
                      onChange={e => updateRedemptionStatus(red.id, e.target.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase outline-none cursor-pointer border ${
                        red.status === 'completed' || red.status === 'claimed'
                          ? 'bg-brand-green/20 text-brand-green border-brand-green/40' 
                          : red.status === 'contacted' 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      <option value="pending" className="bg-neutral-900 text-amber-400">PENDIENTE ⌛ (Contactar en 24h)</option>
                      <option value="contacted" className="bg-neutral-900 text-blue-400">CONTACTADO 📲</option>
                      <option value="completed" className="bg-neutral-900 text-brand-green">ENTREGADO ✓</option>
                    </select>

                    <button
                      onClick={() => deleteRedemption(red.id)}
                      className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      title="Eliminar registro de canje"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-400 font-mono">
                  <span className="flex items-center gap-2">
                    <Mail size={14} className="text-brand-yellow" />
                    <span>Correo registrado: <strong className="text-white">{red.userEmail}</strong></span>
                  </span>
                  <span>
                    Fecha de canje: <strong className="text-brand-yellow">{red.claimedAt ? new Date(red.claimedAt).toLocaleString('es-ES') : 'Reciente'}</strong>
                  </span>
                </div>
              </div>
            ))}

          {redemptions.filter(r => redemptionFilter === 'all' || r.status === redemptionFilter).length === 0 && (
            <div className="py-12 bg-black/40 rounded-3xl border border-dashed border-white/10 text-center text-gray-500 font-mono text-xs uppercase">
              No hay solicitudes de canje de recompensas registradas en esta categoría.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminView;
