export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  xp: number;
  category: string;
  completed?: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  icon?: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'm_welcome',
    title: 'Bienvenido al Ecosistema',
    description: 'Te uniste al ecosistema de RapLife Records.',
    points: 100,
    xp: 50,
    category: 'Comunidad'
  },
  {
    id: 'm_profile',
    title: 'Personaliza tu Perfil',
    description: 'Configura tu nombre artístico, biografía y enlaces oficiales.',
    points: 150,
    xp: 100,
    category: 'Identidad'
  },
  {
    id: 'm_listen',
    title: 'Sintoniza la Radio',
    description: 'Escucha canciones en la radio oficial de RapLife.',
    points: 200,
    xp: 150,
    category: 'Música'
  },
  {
    id: 'm_creative',
    title: 'Arte Callejero',
    description: 'Crea una ilustración o arte de portada usando las herramientas del ecosistema.',
    points: 300,
    xp: 250,
    category: 'Creatividad'
  },
  {
    id: 'm_veteran',
    title: 'Veterano de Calle',
    description: 'Acumulaste 1,000 puntos de experiencia en el ecosistema.',
    points: 500,
    xp: 500,
    category: 'Rango'
  }
];

export const REWARDS: Reward[] = [
  {
    id: 'r_shoutout',
    title: 'Mención en Radio en Vivo',
    description: 'Tu nombre y track mencionado durante la transmisión de radio.',
    pointsCost: 500
  },
  {
    id: 'r_beat_discount',
    title: 'Descuento del 50% en Beat',
    description: 'Cupón exclusivo para instrumentales de la plataforma.',
    pointsCost: 1000
  },
  {
    id: 'r_vip_badge',
    title: 'Insignia VIP en Slides',
    description: 'Aparición destacada en el carrusel de artistas VIP.',
    pointsCost: 2000
  },
  {
    id: 'r_track_rotation',
    title: 'Rotación VIP en Radio',
    description: 'Tu canción entra a rotación prioritaria en la emisora 24/7.',
    pointsCost: 5000
  }
];
