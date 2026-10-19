export interface Track {
  id?: string;
  artistId?: string;
  artistName?: string;
  title: string;
  fullName?: string;
  audioUrl: string;
  coverUrl?: string;
  isRadioInterstitial?: boolean;
  approved?: boolean;
  status?: string;
  duration?: number;
  bpm?: number;
  genre?: string;
  createdAt?: any;
}

export interface BeatItem {
  id?: string;
  title: string;
  producer?: string;
  audioUrl: string;
  bpm?: number;
  key?: string;
  price?: number;
  freeDownload?: boolean;
  createdAt?: any;
}

export interface VideoItem {
  id: string;
  title: string;
  youtubeId?: string;
  videoUrl?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface VideoPlaylistConfig {
  playlistId?: string;
  videos: VideoItem[];
}
