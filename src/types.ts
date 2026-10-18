export type MainCategory = 
  | 'Artista' 
  | 'Creator' 
  | 'Modelo' 
  | 'Productor' 
  | 'Creativo' 
  | 'Hustler' 
  | 'Community'
  | 'Admin';

export const CATEGORY_SPECIALTIES: Record<MainCategory, string[]> = {
  Artista: ['Rap', 'Trap', 'Boom Bap', 'Reggaetón', 'Cantante', 'Compositor'],
  Creator: ['TikTok', 'YouTube', 'Facebook', 'Instagram', 'Podcast', 'Streamer'],
  Modelo: ['Modelo', 'Actor', 'Bailarín', 'Cosplayer', 'Extra'],
  Productor: ['Beatmaker', 'Mixing Engineer', 'Mastering', 'DJ'],
  Creativo: ['Diseñador', 'Editor', 'Motion Graphics', 'IA', 'Animador'],
  Hustler: ['Vendedor', 'Conector', 'Manager', 'Agencia', 'Promotor'],
  Community: ['Fan', 'Oyente', 'Aprendiz', 'Coleccionista'],
  Admin: ['Director', 'Administrador', 'Moderador']
};

export type MissionType = 'daily' | 'weekly' | 'monthly' | 'hustle';
export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'claimed';

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: MainCategory | 'All';
  type: MissionType;
  xpReward: number;
  moneyReward?: number; // USD commission or cash reward for Hustle Missions
  status: MissionStatus;
  deadline?: string;
  actionUrl?: string;
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: MainCategory | 'General';
  unlocked: boolean;
  unlockedAt?: string;
  reqXP?: number;
}

export interface GoalRoadmap {
  goalType: string;
  targetDescription: string;
  createdAt?: string;
  plan30Days: string[];
  plan60Days: string[];
  plan90Days: string[];
}

export interface EcosystemService {
  id: string;
  title: string;
  tagline: string;
  category: string;
  priceUSD: number;
  description: string;
  features: string[];
  hustleCommissionUSD: number;
  iconName: string;
}

export interface EcosystemEvent {
  id: string;
  title: string;
  category: MainCategory;
  prizePoolXP: number;
  prizePoolUSD: number;
  deadline: string;
  rules: string;
  status: 'active' | 'upcoming' | 'completed';
}

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  avatarUrl?: string;
  role: string; // 'fan' | 'artist' | 'admin' or MainCategory
  mainCategory?: MainCategory;
  specialty?: string;
  bio?: string;
  points?: number;
  xp?: number;
  level?: number;
  streakDays?: number;
  lastActiveDate?: string;
  completedMissionsCount?: number;
  hustleEarningsUSD?: number;
  badges?: string[];
  goalRoadmap?: GoalRoadmap;
  instagramUrl?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  isPinned?: boolean;
  isExclusive?: boolean;
}

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  sourceType: 'link' | 'file' | 'local_asset';
  fileName?: string;
  category?: string;
  duration?: number;
  addedAt?: string;
}

export interface VideoPlaylistConfig {
  videos: VideoItem[];
  playbackMode: 'sequential' | 'single' | 'shuffle';
  activeVideoId?: string;
  updatedAt?: any;
}
