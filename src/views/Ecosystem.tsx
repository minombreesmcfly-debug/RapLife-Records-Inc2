import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MISSIONS, REWARDS } from '../lib/gamification';
import { Gamepad2, Award, Sparkles, CheckCircle2, Gift, ArrowRight } from 'lucide-react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const EcosystemView: React.FC = () => {
  const { user, profile, setProfile } = useAuth();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleClaimReward = async (reward: typeof REWARDS[0]) => {
    if (!user || !profile) return;
    const currentPoints = profile.points || 0;
    if (currentPoints < reward.pointsCost) {
      setMessage(`Puntos insuficientes. Necesitas ${reward.pointsCost} puntos.`);
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setRedeeming(reward.id);
    try {
      const newPoints = currentPoints - reward.pointsCost;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          points: newPoints
        });
      } catch (_) {}

      try {
        await addDoc(collection(db, 'redemptions'), {
          userId: user.uid,
          userEmail: user.email || '',
          userDisplayName: profile.displayName || '',
          rewardTitle: reward.title,
          pointsSpent: reward.pointsCost,
          status: 'pending',
          claimedAt: new Date().toISOString()
        });
      } catch (_) {}

      setProfile({ ...profile, points: newPoints });
      setMessage(`¡Has canjeado "${reward.title}" con éxito!`);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err?.message || 'Error al canjear recompensa.');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10 text-left">
      <div className="bg-brand-dark border-4 border-boombox-gray rounded-[2.5rem] p-6 md:p-10 boombox-texture flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-brand-yellow text-black rounded-3xl shadow-glow">
            <Gamepad2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tight">
              MISIONES & RECOMPENSAS
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
              ECOSISTEMA GAMIFICADO RAPLIFE RECORDS
            </p>
          </div>
        </div>

        <div className="px-6 py-3 rounded-2xl bg-black/60 border-2 border-brand-yellow/30 text-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">TUS PUNTOS DE CALLE</span>
          <span className="text-2xl md:text-3xl font-black text-brand-yellow font-mono">
            {profile?.points || 0} PTS
          </span>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-brand-yellow/20 border border-brand-yellow/40 text-brand-yellow text-xs font-bold flex items-center gap-2">
          <Sparkles size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* MISSIONS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="text-brand-yellow" size={20} />
          <h2 className="text-2xl font-black italic uppercase text-white tracking-tight">
            MISIONES ACTIVAS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MISSIONS.map((mission) => (
            <div
              key={mission.id}
              className="bg-brand-dark/90 border-2 border-white/10 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono font-bold text-[9px] uppercase tracking-wider inline-block mb-2">
                  {mission.category}
                </span>
                <h3 className="font-black italic uppercase text-base text-white">
                  {mission.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {mission.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-brand-green font-bold">+{mission.xp} XP</span>
                <span className="text-brand-yellow font-black">+{mission.points} PTS</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REWARDS STORE SECTION */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Gift className="text-brand-yellow" size={20} />
          <h2 className="text-2xl font-black italic uppercase text-white tracking-tight">
            TIENDA DE RECOMPENSAS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REWARDS.map((reward) => (
            <div
              key={reward.id}
              className="bg-brand-dark/90 border-2 border-white/10 hover:border-brand-yellow/40 rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all"
            >
              <div>
                <h3 className="font-black italic uppercase text-base text-white">
                  {reward.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {reward.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-right font-mono font-black text-brand-yellow text-sm">
                  {reward.pointsCost} PTS
                </div>
                <button
                  onClick={() => handleClaimReward(reward)}
                  disabled={redeeming === reward.id}
                  className="w-full py-2.5 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {redeeming === reward.id ? 'CANJEANDO...' : 'CANJEAR PREMIO'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EcosystemView;
