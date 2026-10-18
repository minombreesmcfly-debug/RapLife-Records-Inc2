import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, setDoc, collection, query, getDocs, addDoc, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  MainCategory, CATEGORY_SPECIALTIES, Mission, EcosystemService, EcosystemEvent, Badge 
} from '../types';
import { 
  getLevelFromXP, INITIAL_SERVICES, INITIAL_MISSIONS, INITIAL_BADGES, INITIAL_EVENTS, DAILY_TIPS, generateGoalPlan 
} from '../lib/gamification';
import { 
  Sparkles, Award, Zap, Flame, DollarSign, Target, CheckCircle2, Trophy, 
  Bot, Music, Video, Disc, Sliders, Globe, Megaphone, Image, Shield, ArrowRight, RefreshCw, Star, User, ChevronRight, MessageSquare, Play, Send, HelpCircle, X, Check, Rocket, Phone
} from 'lucide-react';

const EcosystemView = () => {
  const { user, profile } = useAuth();

  // Role & Specialty State
  const [selectedCategory, setSelectedCategory] = useState<MainCategory>(
    (profile?.mainCategory as MainCategory) || (profile?.role as MainCategory) || 'Artista'
  );
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    profile?.specialty || CATEGORY_SPECIALTIES[((profile?.mainCategory as MainCategory) || 'Artista')][0] || 'Rap'
  );
  const [savingCategory, setSavingCategory] = useState(false);

  // Modal State for Category Confirmation
  const [pendingCategoryChange, setPendingCategoryChange] = useState<{ cat: MainCategory; spec: string } | null>(null);

  // Modal State for Agency Info Pop-up
  const [showAgencyModal, setShowAgencyModal] = useState(false);

  // Gamification Stats
  const userXP = profile?.xp || 150;
  const userPoints = profile?.points || 0;
  const userStreak = profile?.streakDays || 3;
  const hustleEarnings = profile?.hustleEarningsUSD || 0;
  const { level, currentLevelXP, nextLevelXP, progressPercent } = getLevelFromXP(userXP);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'missions' | 'services' | 'rankings' | 'events' | 'badges'>('overview');

  // Missions State
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [missionFilter, setMissionFilter] = useState<'all' | 'hustle' | 'daily' | 'weekly'>('all');

  // Goal Roadmap State
  const [goalType, setGoalType] = useState<string>(profile?.goalRoadmap?.goalType || 'vivir_musica');
  const [roadmap, setRoadmap] = useState(profile?.goalRoadmap || generateGoalPlan('vivir_musica'));

  // Leaderboard Users
  const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>([]);
  const [rankingCategory, setRankingCategory] = useState<MainCategory>('Artista');

  // Daily Tip State
  const [tipIndex, setTipIndex] = useState(0);

  // AI Manager Chat Prompt
  const userName = profile?.displayName || user?.displayName || 'Creador';
  const [aiInput, setAiInput] = useState('');
  const [aiChatLogs, setAiChatLogs] = useState<{ sender: 'user' | 'coach'; message: string }[]>([
    {
      sender: 'coach',
      message: `¡Qué hay de nuevo, ${userName}! Soy tu RapLife Manager. He revisado tu perfil de ${selectedCategory} (${selectedSpecialty}) Nivel ${level}. Tienes misiones pendientes que te darán XP y recompensas en dólares. ¿En qué trabajamos hoy?`
    }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Career Boost Request State
  const [boostServices, setBoostServices] = useState<string[]>([]);
  const [boostPhone, setBoostPhone] = useState('');
  const [boostMessage, setBoostMessage] = useState('');
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState(false);

  // Trigger Category Switch Confirmation
  const handleCategoryClick = (cat: MainCategory, spec: string) => {
    if (cat === selectedCategory && spec === selectedSpecialty) return;
    setPendingCategoryChange({ cat, spec });
  };

  // Confirm Category Switch
  const confirmCategoryChange = async () => {
    if (!pendingCategoryChange) return;
    const { cat, spec } = pendingCategoryChange;

    // Apply UI state updates immediately without waiting
    setSelectedCategory(cat);
    setSelectedSpecialty(spec);
    setPendingCategoryChange(null);

    // Add greeting from RapLife Manager
    setAiChatLogs(prev => [
      ...prev,
      {
        sender: 'coach',
        message: `¡Categoría actualizada exitosamente a ${cat} (${spec})! He adaptado tus misiones sugeridas y tu plan estratégico. ¡A romperla!`
      }
    ]);

    // Persist to Firestore asynchronously
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          mainCategory: cat,
          specialty: spec,
          role: cat.toLowerCase() === 'admin' ? 'admin' : cat,
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log(`[ECOSYSTEM] Category changed to ${cat} (${spec}) in Firestore.`);
      } catch (e) {
        console.error("Error updating user category in Firestore:", e);
      }
    }
  };

  // Toggle Boost Service Checkboxes
  const toggleBoostService = (serviceName: string) => {
    setBoostServices(prev => 
      prev.includes(serviceName) 
        ? prev.filter(s => s !== serviceName) 
        : [...prev, serviceName]
    );
  };

  // Handle Career Boost Form Submit
  const handleCareerBoostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (boostServices.length === 0) {
      alert("Selecciona al menos un servicio para dar impulso a tu carrera.");
      return;
    }
    if (!boostPhone.trim()) {
      alert("Por favor ingresa tu número de WhatsApp o teléfono de contacto.");
      return;
    }

    setBoostSubmitting(true);
    try {
      await addDoc(collection(db, 'careerBoostRequests'), {
        userId: user?.uid || 'guest',
        userEmail: user?.email || 'Sin correo',
        userName: userName,
        userCategory: selectedCategory,
        userSpecialty: selectedSpecialty,
        services: boostServices,
        phone: boostPhone,
        message: boostMessage,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setBoostSuccess(true);
      setBoostServices([]);
      setBoostPhone('');
      setBoostMessage('');
    } catch (e) {
      console.error("Error submitting career boost request:", e);
      alert("Ocurrió un error al enviar tu solicitud. Inténtalo de nuevo.");
    } finally {
      setBoostSubmitting(false);
    }
  };

  // Complete & Claim Mission Handler
  const handleClaimMission = async (missionId: string, xpReward: number, moneyReward: number = 0) => {
    if (!user) {
      alert("Inicia sesión para reclamar tus misiones.");
      return;
    }

    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'claimed' } : m));

    try {
      const newXP = userXP + xpReward;
      const newPoints = userPoints + Math.round(xpReward / 2);
      const newEarnings = hustleEarnings + moneyReward;
      const newCompletedCount = (profile?.completedMissionsCount || 0) + 1;

      await setDoc(doc(db, 'users', user.uid), {
        xp: newXP,
        points: newPoints,
        hustleEarningsUSD: newEarnings,
        completedMissionsCount: newCompletedCount,
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert(`🎉 ¡Misión reclamada con éxito! Ganaste +${xpReward} XP ${moneyReward > 0 ? `y $${moneyReward} USD` : ''}.`);
    } catch (e: any) {
      console.error("Error claiming mission:", e);
      alert("Misión completada localmente.");
    }
  };

  // Goal Plan Switcher
  const handleSelectGoal = async (gKey: string) => {
    setGoalType(gKey);
    const newPlan = generateGoalPlan(gKey);
    setRoadmap(newPlan);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          goalRoadmap: newPlan,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error("Error updating goal roadmap:", e);
      }
    }
  };

  // Fetch Leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, 'users'), limit(50));
        const snap = await getDocs(q);
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = users
          .filter((u: any) => !rankingCategory || u.mainCategory === rankingCategory || u.role === 'artist')
          .sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
        setLeaderboardUsers(filtered);
      } catch (e) {
        console.warn("Leaderboard fetch fallback:", e);
        setLeaderboardUsers([]);
      }
    };
    fetchLeaderboard();
  }, [rankingCategory]);

  // AI Chat Assistant
  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiThinking) return;

    const userMsg = aiInput.trim();
    setAiInput('');
    setAiChatLogs(prev => [...prev, { sender: 'user', message: userMsg }]);
    setIsAiThinking(true);

    setTimeout(() => {
      let coachReply = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes("tiktok") || lower.includes("reel") || lower.includes("video") || lower.includes("viral")) {
        coachReply = `Para tus videos en TikTok y Reels, la regla de oro de RapLife es el gancho de los primeros 2.5 segundos: usa la barra más potente o el drop del beat justo al inicio. Mantén subtítulos dinámicos de alto contraste.`;
      } else if (lower.includes("monetizar") || lower.includes("dinero") || lower.includes("ganar")) {
        coachReply = `Para monetizar como ${selectedCategory}, tu mejor vía en RapLife son las Misiones Hustle 💰. Te pagamos comisiones directas de $20 a $50 USD por cada cliente de producción o visualizer que conectes.`;
      } else if (lower.includes("música") || lower.includes("beat") || lower.includes("single")) {
        coachReply = `Te sugiero revisar tu Ruta al Objetivo. Como ${selectedSpecialty}, la clave de este mes es publicar al menos un avance semanal en las consolas de RapLife para subir de nivel al instante.`;
      } else if (lower.includes("nivel") || lower.includes("xp")) {
        coachReply = `Actualmente estás en Nivel ${level} con ${userXP} XP. Te faltan ${nextLevelXP - currentLevelXP} XP para alcanzar el Nivel ${level + 1}. Completa las 2 misiones diarias sugeridas.`;
      } else {
        coachReply = `Entendido, ${userName}. Como ${selectedCategory} (${selectedSpecialty}), mi recomendación estratégica es que completes las Hustle Missions de esta semana. Eso impulsará tu posicionamiento en la agencia.`;
      }

      setAiChatLogs(prev => [...prev, { sender: 'coach', message: coachReply }]);
      setIsAiThinking(false);
    }, 800);
  };

  const filteredMissions = missions.filter(m => {
    if (missionFilter === 'hustle') return m.type === 'hustle';
    if (missionFilter === 'daily') return m.type === 'daily';
    if (missionFilter === 'weekly') return m.type === 'weekly';
    return true;
  });

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-12 pb-24 text-left">
      
      {/* CATEGORY CHANGE CONFIRMATION MODAL */}
      <AnimatePresence>
        {pendingCategoryChange && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border-4 border-brand-yellow p-8 rounded-[2.5rem] max-w-md w-full space-y-6 shadow-2xl text-left"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
                  <Sparkles size={24} />
                </div>
                <button 
                  onClick={() => setPendingCategoryChange(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tight">
                  ¿CAMBIAR A CATEGORÍA {pendingCategoryChange.cat}?
                </h3>
                <p className="text-xs text-gray-300 font-medium leading-relaxed mt-2">
                  ¿Estás seguro de que deseas cambiar tu rol principal a <strong className="text-brand-yellow">{pendingCategoryChange.cat}</strong> ({pendingCategoryChange.spec})?
                  <br /><br />
                  Esto actualizará tus misiones sugeridas y tu plan estratégico en el RapLife Manager.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPendingCategoryChange(null)}
                  className="flex-1 py-3.5 bg-neutral-800 text-gray-300 font-black italic uppercase text-xs rounded-2xl hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  onClick={confirmCategoryChange}
                  disabled={savingCategory}
                  className="flex-1 py-3.5 bg-brand-yellow text-black font-black italic uppercase text-xs rounded-2xl shadow-glow hover:scale-105 transition-all cursor-pointer"
                >
                  {savingCategory ? 'GUARDANDO...' : 'SÍ, CAMBIAR'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGENCY INFO POP-UP MODAL */}
      <AnimatePresence>
        {showAgencyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border-4 border-brand-yellow p-8 rounded-[2.5rem] max-w-xl w-full space-y-6 shadow-2xl text-left relative overflow-hidden"
            >
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-black text-brand-yellow uppercase tracking-widest block">SISTEMA ORIGINAL DE RAP LIFE RECORDS</span>
                  <h3 className="text-2xl font-black italic uppercase text-white tracking-tight mt-1">
                    INCUBADORA & AGENCIA DE TALENTO
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAgencyModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs text-gray-300 leading-relaxed font-medium">
                <p>
                  Es una idea y un sistema exclusivo diseñado por <strong className="text-white">Rap Life Records</strong> para acelerar la carrera de artistas, productores, creadores y talentos urbanos independientes.
                </p>
                <div className="p-4 bg-black/60 border border-brand-yellow/30 rounded-2xl space-y-2">
                  <h4 className="font-black italic uppercase text-brand-yellow text-sm">¿CÓMO FUNCIONA?</h4>
                  <ul className="space-y-2 text-[11px] text-neutral-300">
                    <li className="flex items-start gap-2">
                      <Zap size={14} className="text-brand-yellow shrink-0 mt-0.5" />
                      <span><strong>Gamificación y Niveles:</strong> Acumula XP completando misiones y sube de rango en el sello.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Bot size={14} className="text-brand-yellow shrink-0 mt-0.5" />
                      <span><strong>RapLife Manager IA:</strong> Asesoría constante en lanzamientos, producción y redes sociales.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <DollarSign size={14} className="text-brand-green shrink-0 mt-0.5" />
                      <span><strong>Misiones Hustle:</strong> Monetiza directamente conectando clientes con los servicios oficiales del sello.</span>
                    </li>
                  </ul>
                </div>
                <p>
                  El objetivo es profesionalizar tu proyecto, brindarte herramientas reales de producción y difusión, y ayudarte a <strong>vivir verdaderamente de la música y el arte urbano</strong>.
                </p>
              </div>

              <button
                onClick={() => setShowAgencyModal(false)}
                className="w-full py-4 bg-brand-yellow text-black font-black italic uppercase text-xs rounded-2xl shadow-glow hover:scale-[1.02] transition-all cursor-pointer"
              >
                ENTENDIDO, VAMOS CON TODO 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ECOSYSTEM HEADER HERO */}
      <section className="bg-black/50 border-4 border-boombox-gray rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden boombox-texture shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Trophy size={200} />
        </div>

        <div className="relative z-10 space-y-8">
          
          {/* Top Title & Category Tag */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/30 rounded-full text-brand-yellow text-[9px] font-mono font-black uppercase tracking-widest mb-3">
                <Sparkles size={11} className="animate-spin duration-3000" />
                <span>ECOSISTEMA GAMIFICADO RAP LIFE RECORDS</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter glow-yellow leading-none">
                  INCUBADORA & AGENCIA DE TALENTO
                </h1>
                <button
                  onClick={() => setShowAgencyModal(true)}
                  className="p-2 bg-brand-yellow/10 border border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow hover:text-black rounded-full transition-all cursor-pointer"
                  title="¿Qué es esto?"
                >
                  <HelpCircle size={20} />
                </button>
              </div>

              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
                Nivel de Talento • Misiones Diarias • Ventas Hustle • Mentoría de Carrera IA
              </p>
            </div>

            {/* Quick Category Badge */}
            <div className="bg-neutral-900 border-2 border-brand-yellow/40 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg">
              <div className="w-12 h-12 bg-brand-yellow text-black font-black italic text-xl rounded-xl flex items-center justify-center shadow-md">
                Lvl {level}
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">ROL PRINCIPAL</span>
                <span className="text-lg font-black italic uppercase text-brand-yellow">{selectedCategory}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase block mt-0.5">• {selectedSpecialty}</span>
              </div>
            </div>
          </div>

          {/* Gamification Stats Dashboard Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Level & XP */}
            <div className="bg-black/60 border border-white/10 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-gray-400">
                <span>NIVEL {level}</span>
                <span className="text-brand-yellow">{currentLevelXP}/{nextLevelXP} XP</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-brand-yellow h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[8.5px] font-mono text-gray-500 uppercase">+{nextLevelXP - currentLevelXP} XP para el siguiente rango</p>
            </div>

            {/* Streak Counter */}
            <div className="bg-black/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Flame size={22} className="animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-black italic text-white block leading-none">{userStreak} DÍAS</span>
                <span className="text-[8.5px] font-mono font-black text-gray-400 uppercase tracking-wider">RACHA DIARIA</span>
              </div>
            </div>

            {/* Wallet Points */}
            <div className="bg-black/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-brand-yellow/10 text-brand-yellow rounded-xl">
                <Zap size={22} />
              </div>
              <div>
                <span className="text-xl font-black italic text-brand-yellow block leading-none">{userPoints.toLocaleString()} PTS</span>
                <span className="text-[8.5px] font-mono font-black text-gray-400 uppercase tracking-wider">PUNTOS DE CANJE</span>
              </div>
            </div>

            {/* Hustle Cash Earnings */}
            <div className="bg-black/60 border border-brand-green/30 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl">
                <DollarSign size={22} />
              </div>
              <div>
                <span className="text-xl font-black italic text-brand-green block leading-none">${hustleEarnings} USD</span>
                <span className="text-[8.5px] font-mono font-black text-brand-green/80 uppercase tracking-wider">GANANCIAS HUSTLE</span>
              </div>
            </div>

            {/* Missions Completed */}
            <div className="bg-black/60 border border-white/10 p-4 rounded-2xl flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Target size={22} />
              </div>
              <div>
                <span className="text-xl font-black italic text-white block leading-none">{profile?.completedMissionsCount || 1}</span>
                <span className="text-[8.5px] font-mono font-black text-gray-400 uppercase tracking-wider">MISIONES LISTAS</span>
              </div>
            </div>

          </div>

          {/* CATEGORY & ROLE SELECTOR (With confirmation modal trigger) */}
          <div className="bg-black/70 border border-white/10 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-brand-yellow uppercase tracking-widest">
                ⚙️ SELECCIONA TU CATEGORÍA PRINCIPAL EN EL ECOSISTEMA
              </span>
              <span className="text-[9px] text-gray-500 uppercase font-bold">
                CLIC PARA CAMBIAR
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_SPECIALTIES) as MainCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat, CATEGORY_SPECIALTIES[cat][0])}
                  className={`px-4 py-2 rounded-xl text-xs font-black italic uppercase transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-brand-yellow text-black shadow-glow scale-105' 
                      : 'bg-neutral-900 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Subspecialty selector for selected category */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
              <span className="text-[9px] font-mono text-gray-500 font-bold uppercase mr-2">ESPECIALIDADES:</span>
              {CATEGORY_SPECIALTIES[selectedCategory].map(spec => (
                <button
                  key={spec}
                  onClick={() => handleCategoryClick(selectedCategory, spec)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    selectedSpecialty === spec 
                      ? 'bg-white/20 text-brand-yellow border border-brand-yellow/50' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-white/10 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 rounded-2xl text-xs font-black italic uppercase tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
            }`}
          >
            <Bot size={16} /> RAPLIFE MANAGER & RUTA
          </button>

          <button
            onClick={() => setActiveTab('missions')}
            className={`px-5 py-3 rounded-2xl text-xs font-black italic uppercase tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'missions' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
            }`}
          >
            <Target size={16} /> MISIONES & HUSTLE 💰
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-5 py-3 rounded-2xl text-xs font-black italic uppercase tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'services' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
            }`}
          >
            <Disc size={16} /> SERVICIOS DEL SELLO
          </button>

          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-5 py-3 rounded-2xl text-xs font-black italic uppercase tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rankings' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
            }`}
          >
            <Trophy size={16} /> LEADERBOARDS & RANKINGS
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-5 py-3 rounded-2xl text-xs font-black italic uppercase tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'events' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
            }`}
          >
            <Award size={16} /> RETOS Y EVENTOS
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & RAPLIFE MANAGER & RUTA AL OBJETIVO */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: AI RAPLIFE MANAGER CHAT ENGINE */}
            <div className="lg:col-span-7 bg-neutral-900 border-2 border-brand-yellow/30 p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden text-left">
              <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <div className="p-3 bg-brand-yellow text-black rounded-2xl shadow-glow">
                  <Bot size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-brand-yellow">RAPLIFE MANAGER</h3>
                  <p className="text-[9.5px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                    Asesor Artístico e Incubador Personal de Talentos
                  </p>
                </div>
              </div>

              {/* Chat Message Box */}
              <div className="bg-black/60 border border-white/5 p-4 rounded-2xl h-64 overflow-y-auto space-y-3 custom-scrollbar">
                {aiChatLogs.map((log, index) => (
                  <div key={index} className={`flex gap-3 ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {log.sender === 'coach' && (
                      <div className="w-8 h-8 rounded-xl bg-brand-yellow text-black font-black flex items-center justify-center shrink-0 text-xs">
                        AI
                      </div>
                    )}
                    <div className={`p-3.5 rounded-2xl text-xs max-w-md leading-relaxed font-medium ${
                      log.sender === 'user' 
                        ? 'bg-brand-yellow text-black font-bold text-right rounded-tr-none' 
                        : 'bg-neutral-850 text-neutral-200 border border-white/5 rounded-tl-none'
                    }`}>
                      {log.message}
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex items-center gap-2 text-brand-yellow text-xs font-mono animate-pulse">
                    <Bot size={14} className="animate-spin" /> Analizando métricas del sello...
                  </div>
                )}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendAiMessage} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Pregúntale a tu RapLife Manager sobre videos, TikTok, beats o lanzamientos..."
                  className="flex-grow bg-black/60 border border-white/10 p-4 rounded-xl text-xs text-white focus:border-brand-yellow outline-none font-bold"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={isAiThinking || !aiInput.trim()}
                  className="px-6 bg-brand-yellow text-black font-black uppercase rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>

            {/* RIGHT: CONSEJO DEL DÍA (DAILY TIP) CARD */}
            <div className="lg:col-span-5 bg-black/50 border-2 border-white/10 p-6 md:p-8 rounded-[2.5rem] space-y-6 flex flex-col justify-between h-full text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-[9px] font-mono font-black text-brand-green uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={12} /> CONSEJO DEL DÍA ({DAILY_TIPS[tipIndex].category})
                  </span>
                  <button 
                    onClick={() => setTipIndex((tipIndex + 1) % DAILY_TIPS.length)}
                    className="text-[9px] font-mono text-gray-400 hover:text-brand-yellow flex items-center gap-1 cursor-pointer uppercase font-bold"
                  >
                    <RefreshCw size={10} /> Rotar Tip
                  </button>
                </div>

                <h4 className="text-xl font-black italic uppercase tracking-tight text-white">
                  "{DAILY_TIPS[tipIndex].title}"
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                  {DAILY_TIPS[tipIndex].tip}
                </p>
              </div>

              {/* Weekly Goal Progress Widget */}
              <div className="bg-neutral-900 border border-brand-yellow/20 p-4 rounded-2xl space-y-2 mt-4">
                <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase">
                  <span className="text-gray-400">🎯 OBJETIVO SEMANAL SELLO</span>
                  <span className="text-brand-yellow">2/5 COMPLETADOS</span>
                </div>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-yellow h-full w-[40%]" />
                </div>
                <p className="text-[8.5px] text-gray-500 font-bold uppercase">
                  Completa 4 misiones • Sube 2 contenidos • Consigue 1 cliente
                </p>
              </div>
            </div>

          </div>

          {/* RUTA AL OBJETIVO (6 MONTH GOAL ROADMAP GENERATOR) */}
          <section className="bg-black/60 border-2 border-white/10 p-6 md:p-10 rounded-[2.5rem] space-y-8 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
              <div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                  🗺️ RUTA AL OBJETIVO (PLAN DE 6 MESES)
                </h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
                  Elige tu meta principal y el RapLife Manager generará un itinerario a 30, 60 y 90 días.
                </p>
              </div>

              {/* Goal Selector Buttons */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleSelectGoal('vivir_musica')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    goalType === 'vivir_musica' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
                  }`}
                >
                  🎤 VIVIR DE MI MÚSICA
                </button>
                <button 
                  onClick={() => handleSelectGoal('vender_beats')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    goalType === 'vender_beats' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
                  }`}
                >
                  🎹 VENDER BEATS
                </button>
                <button 
                  onClick={() => handleSelectGoal('creador_contenido')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    goalType === 'creador_contenido' ? 'bg-brand-yellow text-black shadow-glow' : 'bg-neutral-900 text-gray-400 hover:text-white'
                  }`}
                >
                  📲 CREADOR VIRAL
                </button>
              </div>
            </div>

            {/* Target Description */}
            <div className="p-4 bg-brand-yellow/5 border border-brand-yellow/20 rounded-2xl">
              <span className="text-[10px] font-mono font-black text-brand-yellow uppercase tracking-widest block mb-1">
                OBJETIVO ESTRATÉGICO SELECCIONADO:
              </span>
              <p className="text-sm font-bold text-white uppercase italic">
                "{roadmap.targetDescription}"
              </p>
            </div>

            {/* 30, 60, 90 Days Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 30 Days */}
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-xl font-black italic text-brand-yellow uppercase">ETAPA 1 (30 DÍAS)</span>
                  <span className="text-[9px] font-mono bg-brand-yellow/10 text-brand-yellow px-2 py-0.5 rounded font-black">FUNDAMENTOS</span>
                </div>
                <ul className="space-y-3">
                  {roadmap.plan30Days.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-300 font-medium">
                      <CheckCircle2 size={16} className="text-brand-yellow shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 60 Days */}
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-xl font-black italic text-brand-green uppercase">ETAPA 2 (60 DÍAS)</span>
                  <span className="text-[9px] font-mono bg-brand-green/10 text-brand-green px-2 py-0.5 rounded font-black">DESPLIEGUE</span>
                </div>
                <ul className="space-y-3">
                  {roadmap.plan60Days.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-300 font-medium">
                      <CheckCircle2 size={16} className="text-brand-green shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 90 Days */}
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-xl font-black italic text-blue-400 uppercase">ETAPA 3 (90 DÍAS)</span>
                  <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-black">MONETIZACIÓN</span>
                </div>
                <ul className="space-y-3">
                  {roadmap.plan90Days.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-300 font-medium">
                      <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </section>

        </div>
      )}

      {/* TAB 2: MISIONES & 💰 HUSTLE MISSIONS */}
      {activeTab === 'missions' && (
        <div className="space-y-8 text-left">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                MISIONES & HUSTLE COMMERCIAL 💰
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
                Gana XP para subir tu rango y comisiones reales en dólares conectando clientes o difundiendo el sello.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10">
              <button 
                onClick={() => setMissionFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${missionFilter === 'all' ? 'bg-brand-yellow text-black' : 'text-gray-400 hover:text-white'}`}
              >
                TODAS
              </button>
              <button 
                onClick={() => setMissionFilter('hustle')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${missionFilter === 'hustle' ? 'bg-brand-green text-black font-extrabold' : 'text-brand-green hover:text-white'}`}
              >
                💰 HUSTLE (USD + XP)
              </button>
              <button 
                onClick={() => setMissionFilter('daily')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${missionFilter === 'daily' ? 'bg-brand-yellow text-black' : 'text-gray-400 hover:text-white'}`}
              >
                DIARIAS
              </button>
              <button 
                onClick={() => setMissionFilter('weekly')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${missionFilter === 'weekly' ? 'bg-brand-yellow text-black' : 'text-gray-400 hover:text-white'}`}
              >
                SEMANALES
              </button>
            </div>
          </div>

          {/* Missions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMissions.map((m) => {
              const isClaimed = m.status === 'claimed';
              const isHustle = m.type === 'hustle';

              return (
                <div 
                  key={m.id}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-6 ${
                    isClaimed
                      ? 'border-white/5 bg-black/30 opacity-60'
                      : isHustle
                      ? 'border-brand-green/40 bg-brand-green/[0.02] shadow-[0_0_20px_rgba(57,255,20,0.1)] hover:border-brand-green'
                      : 'border-white/10 bg-neutral-900 hover:border-brand-yellow/50'
                  }`}
                >
                  <div className="space-y-4">
                    
                    {/* Mission Header Badges */}
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-wider ${
                        isHustle ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20'
                      }`}>
                        {m.type === 'hustle' ? '💰 HUSTLE REWARD' : `${m.type.toUpperCase()} • ${m.category}`}
                      </span>

                      {m.deadline && (
                        <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">
                          ⌛ {m.deadline}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tight text-white mb-2">
                        {m.title}
                      </h3>
                      <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    {/* Rewards badge */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="px-3 py-1.5 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow rounded-xl text-xs font-mono font-black">
                        +{m.xpReward} XP
                      </div>
                      {m.moneyReward && (
                        <div className="px-3 py-1.5 bg-brand-green/20 border border-brand-green/40 text-brand-green rounded-xl text-xs font-mono font-black">
                          +${m.moneyReward} USD
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleClaimMission(m.id, m.xpReward, m.moneyReward)}
                    disabled={isClaimed}
                    className={`w-full py-4 rounded-xl font-black italic uppercase text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isClaimed
                        ? 'bg-neutral-800 text-gray-500 cursor-not-allowed'
                        : isHustle
                        ? 'bg-brand-green text-black shadow-glow hover:scale-[1.02] active:scale-95'
                        : 'bg-brand-yellow text-black shadow-glow hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isClaimed ? (
                      <>
                        <CheckCircle2 size={16} /> RECOMPENSA RECLAMADA
                      </>
                    ) : (
                      <>
                        <Zap size={16} /> COMPLETAR Y RECLAMAR
                      </>
                    )}
                  </button>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 3: SERVICIOS DEL SELLO */}
      {activeTab === 'services' && (
        <div className="space-y-8 text-left">
          <div>
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
              SERVICIOS MUSICALES & CREATIVOS DE RAP LIFE RECORDS
            </h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
              Catálogo oficial disponible para artistas. Puedes vender estos servicios como Hustler y recibir comisión directa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {INITIAL_SERVICES.map((s) => (
              <div 
                key={s.id}
                className="bg-neutral-900 border-2 border-white/10 p-6 rounded-3xl space-y-6 flex flex-col justify-between hover:border-brand-yellow/50 transition-all shadow-xl"
              >
                <div className="space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-[9px] font-mono text-brand-yellow font-black uppercase tracking-widest">
                      {s.category}
                    </span>
                    <span className="text-2xl font-black italic text-brand-yellow">
                      ${s.priceUSD} USD
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-white mb-1">
                      {s.title}
                    </h3>
                    <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
                      {s.tagline}
                    </p>
                    <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                      {s.description}
                    </p>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/5">
                    {s.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-[11px] text-gray-400 font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-brand-yellow rounded-full" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                </div>

                {/* Hustle Commission Banner */}
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-brand-green/10 border border-brand-green/30 rounded-xl flex items-center justify-between text-brand-green text-xs font-mono font-black">
                    <span>COMISIÓN POR CONECTAR CLIENTE:</span>
                    <span>+${s.hustleCommissionUSD} USD</span>
                  </div>

                  <button 
                    onClick={() => {
                      setActiveTab('missions');
                      setMissionFilter('hustle');
                    }}
                    className="w-full py-3.5 bg-brand-yellow text-black font-black italic uppercase text-xs rounded-xl shadow-glow hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>ACEPTAR MISIÓN HUSTLE ($)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LEADERBOARDS & RANKINGS */}
      {activeTab === 'rankings' && (
        <div className="space-y-8 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                LEADERBOARDS & TABLA DE RANGOS
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
                Los miembros con mayor XP lideran el ecosistema y reciben incentivos mensuales del sello.
              </p>
            </div>

            {/* Category Ranking Selector */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_SPECIALTIES) as MainCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setRankingCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${
                    rankingCategory === cat ? 'bg-brand-yellow text-black' : 'bg-neutral-900 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Ranking Table */}
          <div className="bg-neutral-900 border-2 border-white/10 rounded-3xl p-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">
                  <th className="pb-4">POSICIÓN</th>
                  <th className="pb-4">TALENTO</th>
                  <th className="pb-4">CATEGORÍA</th>
                  <th className="pb-4">NIVEL</th>
                  <th className="pb-4">EXPERIENCIA (XP)</th>
                  <th className="pb-4 text-right">MISIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {leaderboardUsers.map((u, idx) => {
                  const uLvl = getLevelFromXP(u.xp || 150).level;
                  return (
                    <tr key={u.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 font-black italic text-lg">
                        {idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `#${idx + 1}`}
                      </td>
                      <td className="py-4 font-black uppercase text-white flex items-center gap-3">
                        <img 
                          src={u.photoURL || u.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'} 
                          className="w-9 h-9 rounded-xl object-cover border border-white/10"
                          alt="" 
                        />
                        <div>
                          <span className="block leading-tight">{u.displayName || 'Ghetto Talent'}</span>
                          <span className="text-[9px] text-gray-500 font-mono font-bold uppercase">{u.email || 'Miembro RapLife'}</span>
                        </div>
                      </td>
                      <td className="py-4 font-mono text-xs text-brand-yellow uppercase font-black">
                        {u.mainCategory || u.role || 'Artista'}
                      </td>
                      <td className="py-4 font-black italic text-brand-green">
                        Lvl {uLvl}
                      </td>
                      <td className="py-4 font-mono font-bold text-gray-300">
                        {(u.xp || 150).toLocaleString()} XP
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-gray-400">
                        {u.completedMissionsCount || 0}
                      </td>
                    </tr>
                  );
                })}
                {leaderboardUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 italic uppercase font-bold text-xs">
                      CARGANDO RANKINGS DEL SERVIDOR...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RETOS Y EVENTOS */}
      {activeTab === 'events' && (
        <div className="space-y-8 text-left">
          <div>
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
              EVENTOS Y RETOS MENSUALES
            </h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
              Participa en batallas de beats, retos de canciones y competencias audiovisuales con bolsas en efectivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {INITIAL_EVENTS.map((evt) => (
              <div 
                key={evt.id}
                className="bg-neutral-900 border-2 border-brand-yellow/30 p-6 rounded-3xl space-y-6 flex flex-col justify-between shadow-2xl relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow text-[9px] font-mono font-black uppercase rounded-full">
                      {evt.category}
                    </span>
                    <span className="text-[9px] font-mono text-brand-green font-bold uppercase">
                      ⌛ {evt.deadline}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black italic uppercase tracking-tight text-white leading-tight">
                    {evt.title}
                  </h3>

                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    {evt.rules}
                  </p>

                  <div className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest block">
                      BOLSA DE PREMIOS OFICIAL
                    </span>
                    <span className="text-2xl font-black italic text-brand-yellow block">
                      ${evt.prizePoolUSD} USD + {evt.prizePoolXP} XP
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => alert(`¡Te has inscrito al evento "${evt.title}"! Revisa tu correo o WhatsApp para el envío de tu propuesta.`)}
                  className="w-full py-4 bg-brand-yellow text-black font-black italic uppercase text-xs rounded-xl shadow-glow hover:scale-[1.02] transition-all cursor-pointer"
                >
                  INSCRIBIRME Y PARTICIPAR ⚡
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "¿QUIERES DAR UN IMPULSO EXTRA A TU CARRERA?" SECTION */}
      <section className="bg-neutral-900 border-4 border-brand-yellow p-8 md:p-12 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Rocket size={220} />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow text-black rounded-full text-[9px] font-mono font-black uppercase tracking-widest mb-2">
                <Rocket size={12} /> IMPULSO DE CARRERA RAP LIFE RECORDS
              </div>
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                ¿QUIERES DAR UN IMPULSO EXTRA A TU CARRERA?
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Selecciona las áreas que necesitas acelerar. El equipo de RapLife y tu RapLife Manager analizarán tu proyecto.
              </p>
            </div>
          </div>

          {boostSuccess ? (
            <div className="p-8 bg-brand-green/10 border-2 border-brand-green rounded-3xl text-center space-y-4">
              <div className="w-16 h-16 bg-brand-green text-black font-black text-2xl rounded-2xl flex items-center justify-center mx-auto shadow-glow">
                ✓
              </div>
              <h3 className="text-2xl font-black italic uppercase text-brand-green">
                ¡SOLICITUD ENVIADA CON ÉXITO!
              </h3>
              <p className="text-xs text-neutral-200 font-medium max-w-lg mx-auto">
                Tu mensaje y selección de servicios han sido recibidos en la consola central del sello. Un asesor del equipo de RapLife Records y tu RapLife Manager se pondrán en contacto contigo por WhatsApp o correo.
              </p>
              <button 
                onClick={() => setBoostSuccess(false)}
                className="px-6 py-3 bg-brand-green text-black font-black uppercase text-xs rounded-xl shadow-glow hover:scale-105 transition-all cursor-pointer"
              >
                ENVIAR OTRA SOLICITUD
              </button>
            </div>
          ) : (
            <form onSubmit={handleCareerBoostSubmit} className="space-y-8">
              
              {/* Checkboxes grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'video', label: '🎥 VIDEOCLIP O VISUALIZER IA', desc: 'Producción audiovisual cinematográfica o loop audio-reactivo.' },
                  { id: 'asesoria', label: '💡 ASESORÍA PERSONALIZADA DE CARRERA', desc: 'Estrategia de lanzamientos, pitch a playlists y branding.' },
                  { id: 'beats', label: '🎹 BEATS PERSONALIZADOS', desc: 'Instrumental exclusiva a la medida en Boom Bap, Trap, Drill o Reggaetón.' },
                  { id: 'mixing', label: '🎚️ MEZCLA Y MASTERING PRO', desc: 'Calidad comercial con niveles estándar para Spotify y Apple Music.' },
                  { id: 'promo', label: '📻 PROMOCIÓN EN RAPLIFE RADIO & REDES', desc: 'Rotación oficial en la emisora y difusión en cuentas oficiales.' },
                  { id: 'design', label: '🎨 DISEÑO DE PORTADA Y SITIO WEB', desc: 'Arte gráfico de alto impacto y presencia digital oficial.' },
                ].map((item) => {
                  const isChecked = boostServices.includes(item.label);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => toggleBoostService(item.label)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                        isChecked 
                          ? 'border-brand-yellow bg-brand-yellow/10 shadow-glow' 
                          : 'border-white/10 bg-black/50 hover:border-white/30'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked ? 'bg-brand-yellow border-brand-yellow text-black font-black' : 'border-gray-500'
                      }`}>
                        {isChecked && <Check size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-black italic uppercase text-white leading-snug">{item.label}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-mono font-black text-brand-yellow uppercase tracking-widest block mb-2">
                    TELÉFONO / WHATSAPP DE CONTACTO *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="text" 
                      required
                      placeholder="+57 300 000 0000"
                      className="w-full bg-black/60 border border-white/10 pl-12 pr-4 py-3.5 rounded-xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
                      value={boostPhone}
                      onChange={e => setBoostPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-black text-brand-yellow uppercase tracking-widest block mb-2">
                    MENSAJE O DETALLES DE TU PROYECTO (OPCIONAL)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Escribe detalles de tu próxima canción o meta artística..."
                    className="w-full bg-black/60 border border-white/10 px-4 py-3.5 rounded-xl text-xs font-bold text-white focus:border-brand-yellow outline-none"
                    value={boostMessage}
                    onChange={e => setBoostMessage(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={boostSubmitting}
                className="w-full py-5 bg-brand-yellow text-black font-black italic uppercase text-sm rounded-2xl shadow-glow hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {boostSubmitting ? 'ENVIANDO SOLICITUD...' : 'SOLICITAR IMPULSO A MI CARRERA 🚀'}
              </button>

            </form>
          )}

        </div>
      </section>

    </div>
  );
};

export default EcosystemView;
