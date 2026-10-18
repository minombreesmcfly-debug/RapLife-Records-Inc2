import { Mission, Badge, EcosystemService, EcosystemEvent, MainCategory, GoalRoadmap } from '../types';

export const getLevelFromXP = (xp: number = 0): { level: number; currentLevelXP: number; nextLevelXP: number; progressPercent: number } => {
  const xpPerLevel = 500;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXP = xp % xpPerLevel;
  const nextLevelXP = xpPerLevel;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));
  return { level, currentLevelXP, nextLevelXP, progressPercent };
};

export const INITIAL_SERVICES: EcosystemService[] = [
  {
    id: 'beat-custom',
    title: 'BEAT PERSONALIZADO',
    tagline: 'Instrumental Exclusiva a la Medida',
    category: 'Productor',
    priceUSD: 150,
    description: 'Composición de un beat único estilo Boom Bap, Trap, Drill o Reggaetón con instrumentación real y mezcla estéreo WAV.',
    features: ['Multitracks / Stems incluidos', 'Licencia Exclusiva 100%', '2 revisiones de arreglos'],
    hustleCommissionUSD: 30,
    iconName: 'Music'
  },
  {
    id: 'prod-musical',
    title: 'PRODUCCIÓN MUSICAL COMPLETA',
    tagline: 'Dirección Sonora de Single o EP',
    category: 'Productor',
    priceUSD: 350,
    description: 'Producción de principio a fin: desde la maqueta hasta la grabación vocal guiada, arreglos y entrega comercial final.',
    features: ['Grabación o afinar voces', 'Edición rítmica avanzada', 'Sound Design exclusivo'],
    hustleCommissionUSD: 70,
    iconName: 'Disc'
  },
  {
    id: 'mix-master',
    title: 'MEZCLA Y MASTERING PRO',
    tagline: 'Calidad Digital para Spotify y Radio',
    category: 'Productor',
    priceUSD: 100,
    description: 'Procesamiento analógico y digital para lograr potencia, claridad y los niveles LUFS estándar de la industria.',
    features: ['Balance frecuencial y espacial', 'Mastering para streaming & CD', 'Versión Acapella + Instrumental'],
    hustleCommissionUSD: 20,
    iconName: 'Sliders'
  },
  {
    id: 'visualizer-ia',
    title: 'VISUALIZER IA HD',
    tagline: 'Video Animado Audio-Reactivo',
    category: 'Creativo',
    priceUSD: 80,
    description: 'Loop o animación generativa con estética cyberpunk / ghetto urbano optimizada para YouTube y Reels 9:16.',
    features: ['Formato 16:9 y 9:16', 'Espectro de frecuencia reactivo', 'Integración de logotipo o portada'],
    hustleCommissionUSD: 20,
    iconName: 'Sparkles'
  },
  {
    id: 'videoclip-ia',
    title: 'VIDEOCLIP CINEMATOGRÁFICO IA',
    tagline: 'Producción Audiovisual Completa',
    category: 'Creativo',
    priceUSD: 250,
    description: 'Videoclip narrativo de 3 minutos generado con inteligencia artificial, edición al ritmo del tema y sincronización de labios.',
    features: ['Resolución 4K UHD', 'Guion y dirección de arte', 'Escenarios y avatars ilimitados'],
    hustleCommissionUSD: 50,
    iconName: 'Video'
  },
  {
    id: 'cover-art',
    title: 'DISEÑO DE PORTADA DE SINGLE/ÁLBUM',
    tagline: 'Arte Gráfico de Alto Impacto',
    category: 'Creativo',
    priceUSD: 60,
    description: 'Portada original en alta resolución (3000x3000px) adaptada a las normas estrictas de Spotify y Apple Music.',
    features: ['Mockup 3D de vinilo / CD', '3 propuestas iniciales', 'Tipografía urbana personalizada'],
    hustleCommissionUSD: 15,
    iconName: 'Image'
  },
  {
    id: 'artist-website',
    title: 'SITIO WEB DE ARTISTA / BRANDING',
    tagline: 'Presencia Oficial e Incubadora',
    category: 'Creativo',
    priceUSD: 200,
    description: 'Plataforma web con bio, discografía interactiva, reproductores integrados, formulario de contratación y enlaces oficiales.',
    features: ['Optimizado para móviles', 'Integración con Spotify & YouTube', 'Formulario de contacto directo'],
    hustleCommissionUSD: 40,
    iconName: 'Globe'
  },
  {
    id: 'commercial-ia',
    title: 'COMERCIAL / PROMO REEL IA',
    tagline: 'Campaña Publicitaria de Marca',
    category: 'Creator',
    priceUSD: 120,
    description: 'Anuncio promocional de 30 a 60 segundos enfocado en ventas, lanzamientos de productos o eventos musicales.',
    features: ['Locución profesional IA', 'Subtítulos dinámicos de alto engagement', 'Música de fondo licenciada'],
    hustleCommissionUSD: 25,
    iconName: 'Megaphone'
  }
];

export const INITIAL_MISSIONS: Mission[] = [
  // 💰 HUSTLE MISSIONS (Accessible to ALL)
  {
    id: 'hustle-client-prod',
    title: '💰 Conseguir un Cliente para Producción',
    description: 'Conecta a un artista independiente con RapLife para producir su nuevo single.',
    category: 'All',
    type: 'hustle',
    xpReward: 500,
    moneyReward: 50,
    status: 'pending',
    deadline: 'Sin límite'
  },
  {
    id: 'hustle-vender-beat',
    title: '💰 Vender un Beat Exclusivo',
    description: 'Recomienda el catálogo de beats de RapLife y logra la venta de una instrumental.',
    category: 'All',
    type: 'hustle',
    xpReward: 400,
    moneyReward: 30,
    status: 'pending',
    deadline: 'Sin límite'
  },
  {
    id: 'hustle-vender-visualizer',
    title: '💰 Vender un Visualizer IA',
    description: 'Promociona el servicio de Visualizers IA con un colega o creador.',
    category: 'All',
    type: 'hustle',
    xpReward: 350,
    moneyReward: 20,
    status: 'pending',
    deadline: 'Sin límite'
  },
  {
    id: 'hustle-vender-videoclip',
    title: '💰 Vender un Videoclip IA',
    description: 'Logra que una marca o artista solicite un Videoclip Cinematográfico IA.',
    category: 'All',
    type: 'hustle',
    xpReward: 600,
    moneyReward: 50,
    status: 'pending',
    deadline: 'Sin límite'
  },
  {
    id: 'hustle-compartir-flyer',
    title: '💰 Compartir Flyer Oficial en Historias',
    description: 'Sube el flyer de la radio de RapLife Records a tu Instagram o TikTok taggeando a @raplife.records.',
    category: 'All',
    type: 'hustle',
    xpReward: 150,
    status: 'pending',
    deadline: 'Diaria'
  },
  {
    id: 'hustle-consigue-portada',
    title: '💰 Vender un Diseño de Portada',
    description: 'Conecta a un artista que necesite portada para su nuevo lanzamiento.',
    category: 'All',
    type: 'hustle',
    xpReward: 250,
    moneyReward: 15,
    status: 'pending',
    deadline: 'Sin límite'
  },

  // ROLE SPECIFIC MISSIONS
  {
    id: 'art-1',
    title: '🎤 Publicar una Maqueta o Snippet',
    description: 'Sube un adelanto de tu próxima canción a tu perfil o redes de RapLife.',
    category: 'Artista',
    type: 'daily',
    xpReward: 200,
    status: 'pending'
  },
  {
    id: 'art-2',
    title: '🔥 Escribir 16 Barras para un Beat',
    description: 'Elige un beat del reproductor y escribe un verso de 16 barras.',
    category: 'Artista',
    type: 'daily',
    xpReward: 150,
    status: 'pending'
  },
  {
    id: 'prod-1',
    title: '🎹 Crear un Beat Boom Bap / Trap',
    description: 'Compón una instrumental de al menos 2 minutos y súbela al baúl de beats.',
    category: 'Productor',
    type: 'weekly',
    xpReward: 300,
    status: 'pending'
  },
  {
    id: 'creat-1',
    title: '🎨 Diseñar un Concept Art de Single',
    description: 'Crea una ilustración o arte de portada usando las herramientas del ecosistema.',
    category: 'Creativo',
    type: 'weekly',
    xpReward: 250,
    status: 'pending'
  },
  {
    id: 'creator-1',
    title: '📲 Subir un Reel o Short con Música de RapLife',
    description: 'Crea un video en TikTok/Instagram usando el audio oficial de la radio.',
    category: 'Creator',
    type: 'daily',
    xpReward: 200,
    status: 'pending'
  },
  {
    id: 'model-1',
    title: '📸 Actualizar Book o Fotos de Estudio',
    description: 'Agrega una foto reciente con la estética urbana de la marca a tu perfil.',
    category: 'Modelo',
    type: 'monthly',
    xpReward: 250,
    status: 'pending'
  },
  {
    id: 'comm-1',
    title: '🎧 Escuchar 3 Tracks Completos en la Radio',
    description: 'Mantén sintonizada la radio oficial durante al menos 10 minutos.',
    category: 'Community',
    type: 'daily',
    xpReward: 100,
    status: 'pending'
  }
];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'b-welcome',
    title: 'Bienvenido al Ghetto',
    icon: '🔥',
    description: 'Te uniste al ecosistema de RapLife Records.',
    category: 'General',
    unlocked: true,
    unlockedAt: '2026-07-27'
  },
  {
    id: 'b-first-client',
    title: 'Primer Cliente',
    icon: '💰',
    description: 'Conectaste a tu primer cliente dentro de las Hustle Missions.',
    category: 'Hustler',
    unlocked: false,
    reqXP: 500
  },
  {
    id: 'b-beatmaster',
    title: 'Rhythm Master',
    icon: '🎹',
    description: 'Subiste o produjiste más de 3 instruementales.',
    category: 'Productor',
    unlocked: false,
    reqXP: 1000
  },
  {
    id: 'b-top-artist',
    title: 'Top Artista',
    icon: '🎤',
    description: 'Alcanzaste el Nivel 5 como Artista Exclusivo.',
    category: 'Artista',
    unlocked: false,
    reqXP: 2500
  },
  {
    id: 'b-creator-star',
    title: 'Viral Creator',
    icon: '📲',
    description: 'Lograste más de 1,000 interacciones en contenido promocional.',
    category: 'Creator',
    unlocked: false,
    reqXP: 1500
  },
  {
    id: 'b-1000xp',
    title: '1,000 XP Club',
    icon: '⚡',
    description: 'Acumulaste 1,000 puntos de experiencia en el ecosistema.',
    category: 'General',
    unlocked: false,
    reqXP: 1000
  }
];

export const INITIAL_EVENTS: EcosystemEvent[] = [
  {
    id: 'event-beat-battle-1',
    title: 'BOOM BAP BEAT BATTLE 2026',
    category: 'Productor',
    prizePoolXP: 5000,
    prizePoolUSD: 200,
    deadline: 'Inicia en 5 días',
    rules: 'Compón un beat Boom Bap de 90 BPM usando el kit oficial de muestras de RapLife.',
    status: 'active'
  },
  {
    id: 'event-freestyle-challenge',
    title: 'FREESTYLE CALLEJERO 16 BARRAS',
    category: 'Artista',
    prizePoolXP: 3000,
    prizePoolUSD: 100,
    deadline: 'Inicia en 12 días',
    rules: 'Graba un video de 1 minuto escupiendo tu mejor verso sobre el beat en rotación.',
    status: 'upcoming'
  },
  {
    id: 'event-creator-challenge',
    title: 'REEL RETO TIKTOK DE IMPACTO',
    category: 'Creator',
    prizePoolXP: 2500,
    prizePoolUSD: 80,
    deadline: 'Activo ahora',
    rules: 'El Reel o TikTok con el tema oficial que logre mayor alcance en 7 días gana la bolsa.',
    status: 'active'
  }
];

export const DAILY_TIPS = [
  {
    category: 'Marketing',
    title: 'El Gancho de los primeros 3 segundos',
    tip: 'En TikTok y Shorts, si no muestras el momento culminante o la frase más fuerte de tu tema en los primeros 3 segundos, el 80% de las personas deslizarán.'
  },
  {
    category: 'Ventas & Hustle',
    title: 'Ofrece soluciones, no servicios',
    tip: 'No le digas a un artista "te vendo un beat". Diles "tengo el concepto sonoro exacto para que tu próximo single suene como las listas de Spotify".'
  },
  {
    category: 'Producción',
    title: 'Espacio para la voz',
    tip: 'Limpia la frecuencia de 1kHz a 3kHz en las guitarras y sintetizadores de tu instrumental con un EQ suave para que la voz del cantante encaje sin esfuerzo.'
  },
  {
    category: 'Marca Personal',
    title: 'Coherencia Estética',
    tip: 'Mantén la misma paleta de colores, tipografía y estilo en tus portadas, avatar e historias. La consistencia crea autoridad.'
  },
  {
    category: 'Negocio & Finanzas',
    title: 'Registra tus obras',
    tip: 'Cada canción que grabes debe estar registrada con sus compositores y porcentajes de producción antes de enviarla a distribución digital.'
  }
];

export const generateGoalPlan = (goalType: string): GoalRoadmap => {
  const plans: Record<string, GoalRoadmap> = {
    'vivir_musica': {
      goalType: 'Quiero vivir de mi música',
      targetDescription: 'Crear una estructura de lanzamientos recurrentes, monetizar streaming y conseguir fechas en vivo.',
      plan30Days: [
        'Define tu identidad visual y completa tu perfil de artista.',
        'Prepara un calendario de 3 singles para los próximos 90 días.',
        'Publica 5 Reels/TikToks enseñando el proceso de composición.'
      ],
      plan60Days: [
        'Lanza tu primer single oficial con un Visualizer IA.',
        'Efectúa tu pitch a playlists editoriales en Spotify for Artists.',
        'Consigue tus primeras 1,000 reproducciones reales.'
      ],
      plan90Days: [
        'Lanza tu EP o segundo single destacado.',
        'Organiza tu primera presentación o sesión de escucha en vivo.',
        'Integra tus redes con las Hustle Missions para generar ingresos paralelos.'
      ]
    },
    'vender_beats': {
      goalType: 'Quiero vender beats e instrumentales',
      targetDescription: 'Posicionarte como beatmaker de referencia y generar ventas semanales en el marketplace.',
      plan30Days: [
        'Subir un catálogo inicial de 5 beats etiquetados por género.',
        'Crear snippets visuales con ondas de audio para Instagram/TikTok.',
        'Conectar con 3 artistas del ecosistema RapLife para colaboraciones.'
      ],
      plan60Days: [
        'Completar 3 Hustle Missions vendiendo instrumentales.',
        'Lanzar un Drum Kit o Sample Pack gratuito para captar contactos.',
        'Alcanzar el nivel 3 de Productor.'
      ],
      plan90Days: [
        'Consolidar un ingreso recurrente de $300 - $500 USD en beats.',
        'Obtener la insignia Rhythm Master.',
        'Coproducir un single de rotación oficial en la Radio.'
      ]
    },
    'creador_contenido': {
      goalType: 'Quiero ser creador de contenido viral',
      targetDescription: 'Aumentar tu audiencia, colaboraciones y patrocinios creando contenido urbano.',
      plan30Days: [
        'Publicar 1 contenido diario usando audios de RapLife Records.',
        'Optimizar tu biografía e itinerario de transmisiones.',
        'Interactuar con la comunidad en los retos mensuales.'
      ],
      plan60Days: [
        'Participar en el Creator Challenge y optar por la bolsa de premios.',
        'Realizar un podcast o entrevista con un artista del sello.',
        'Completar 5 misiones de difusión social.'
      ],
      plan90Days: [
        'Alcanzar más de 10,000 visualizaciones acumuladas.',
        'Gestionar patrocinios de marcas en las Hustle Missions.',
        'Formar parte del equipo oficial de difusores VIP.'
      ]
    }
  };

  return plans[goalType] || plans['vivir_musica'];
};
