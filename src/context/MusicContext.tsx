import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  togglePlay: () => void;
  play: (track?: Track) => void;
  pause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  radioMode: boolean;
  setRadioMode: (mode: boolean) => void;
  playlist: Track[];
  playRadioPlaylist: (tracks: Track[], startIndex?: number) => void;
  refreshRadioTracks: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType>({
  currentTrack: null,
  isPlaying: false,
  togglePlay: () => {},
  play: () => {},
  pause: () => {},
  nextTrack: () => {},
  prevTrack: () => {},
  currentTime: 0,
  duration: 0,
  seek: () => {},
  volume: 1,
  setVolume: () => {},
  isMuted: false,
  toggleMute: () => {},
  radioMode: true,
  setRadioMode: () => {},
  playlist: [],
  playRadioPlaylist: () => {},
  refreshRadioTracks: async () => {},
});

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [radioMode, setRadioMode] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchRadioTracks = async () => {
    try {
      const serverRes = await fetch('/api/radio-local-songs');
      let localSongs: Track[] = [];
      if (serverRes.ok) {
        localSongs = await serverRes.json();
      }

      let firestoreSongs: Track[] = [];
      try {
        const q = query(collection(db, 'tracks'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        firestoreSongs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Track));
      } catch (fErr) {
        console.warn('[MUSIC] Firestore tracks load notice:', fErr);
      }

      const map = new Map<string, Track>();
      for (const t of localSongs) {
        const k = t.audioUrl || t.title;
        if (k) map.set(k, t);
      }
      for (const t of firestoreSongs) {
        const k = t.audioUrl || t.title;
        if (k && !map.has(k)) map.set(k, t);
      }

      const merged = Array.from(map.values());
      if (merged.length > 0) {
        setPlaylist(merged);
        if (!currentTrack) {
          setCurrentTrack(merged[0]);
        }
      }
    } catch (err) {
      console.warn('[MUSIC] Error fetching radio tracks:', err);
    }
  };

  useEffect(() => {
    fetchRadioTracks();
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
      };

      audio.onended = () => {
        nextTrack();
      };

      audio.onerror = (e) => {
        console.warn('[AUDIO] Error playing current track, skipping to next:', e);
        setTimeout(() => nextTrack(), 1000);
      };
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const play = (track?: Track) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (track) {
      setCurrentTrack(track);
      audio.src = track.audioUrl;
      audio.play().then(() => setIsPlaying(true)).catch(e => console.warn('[AUDIO] Play error:', e));
    } else if (currentTrack) {
      if (audio.src !== currentTrack.audioUrl) {
        audio.src = currentTrack.audioUrl;
      }
      audio.play().then(() => setIsPlaying(true)).catch(e => console.warn('[AUDIO] Play error:', e));
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    const nextIdx = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIdx);
    play(playlist[nextIdx]);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    play(playlist[prevIdx]);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
    if (isMuted && v > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const playRadioPlaylist = (tracks: Track[], startIndex: number = 0) => {
    if (tracks.length === 0) return;
    setPlaylist(tracks);
    setCurrentIndex(startIndex);
    play(tracks[startIndex]);
  };

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      togglePlay,
      play,
      pause,
      nextTrack,
      prevTrack,
      currentTime,
      duration,
      seek,
      volume,
      setVolume,
      isMuted,
      toggleMute,
      radioMode,
      setRadioMode,
      playlist,
      playRadioPlaylist,
      refreshRadioTracks: fetchRadioTracks
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
