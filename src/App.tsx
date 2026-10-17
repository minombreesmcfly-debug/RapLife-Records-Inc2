import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useMusic } from './context/MusicContext';
import { 
  Gamepad2, ShieldCheck, Upload, LogOut, Play, Pause, Volume2, VolumeX 
} from 'lucide-react';
import { signInWithGoogle, logoutUser } from './lib/firebase';
import RadioStrip from './components/RadioStrip';
import MobileNav from './components/MobileNav';
import SocialLinks from './components/SocialLinks';
import Footer from './components/Footer';

const HomeView = lazy(() => import('./views/Home'));
const GameView = lazy(() => import('./views/Game'));
const AdminView = lazy(() => import('./views/Admin'));
const ArtistProfileView = lazy(() => import('./views/ArtistProfile'));
const ArtistsView = lazy(() => import('./views/Artists'));
const ProfileSetupView = lazy(() => import('./views/ProfileSetup'));
const ProfileSettingsView = lazy(() => import('./views/ProfileSettings'));
const UploadTrackView = lazy(() => import('./views/UploadTrack'));
const EcosystemView = lazy(() => import('./views/Ecosystem'));

export const App: React.FC = () => {
  const { user, profile, loading, isAdmin, loginAsDemo } = useAuth();
  const { currentTrack, isPlaying, togglePlay, isMuted, toggleMute } = useMusic();
  const [isLoginPending, setIsLoginPending] = useState(false);

  const handleLogin = async () => {
    setIsLoginPending(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('[AUTH] Notice logging in:', err?.message || err);
      // If popup fails or is blocked in iframe, allow demo sign-in
      if (loginAsDemo) {
        loginAsDemo();
      }
    } finally {
      setIsLoginPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-yellow selection:text-black overflow-x-hidden relative flex flex-col justify-between">
      {/* URBAN GRAFFITI WALL BACKDROP */}
      <div 
        id="urban-graffiti-wall-backdrop"
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none"
      >
        <img 
          src="/graffiti_wall_bg.jpg" 
          alt="Wallpaper" 
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/assets/graffiti_wall_bg.jpg';
          }}
          className="w-full h-full object-cover object-center opacity-70 select-none transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70 backdrop-blur-[0.5px]" />
      </div>

      {/* HEADER */}
      <header className="bg-black/80 backdrop-blur-lg border-b-4 md:border-b-8 border-black/80 p-3 md:p-6 fixed top-0 left-0 right-0 z-[100] shadow-2xl">
        <div className="flex items-center justify-between gap-4 w-full max-w-[1920px] mx-auto">
          
          {/* BRANDING */}
          <div className="flex items-center gap-2 md:gap-5">
            <Link to="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-black/80 rounded-full border-2 md:border-4 border-brand-yellow/30 speaker-grill flex items-center justify-center shadow-inner relative overflow-hidden group-hover:scale-105 transition-transform">
                <img src="/assets/Logo.png" alt="RapLife Logo" className="w-[85%] h-[85%] object-contain relative z-10" />
                <div className="w-full h-full bg-brand-yellow/10 rounded-full animate-pulse absolute inset-0" />
              </div>
              <div className="text-left">
                <h1 className="text-lg md:text-3xl font-black tracking-tighter glow-yellow italic uppercase leading-none">RAPLIFE</h1>
              </div>
            </Link>

            <div className="hidden lg:flex items-center border-l border-white/10 pl-4">
              <SocialLinks variant="header" />
            </div>
          </div>

          {/* LCD STATUS & CONTROLS */}
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="lcd-display px-2.5 py-1 md:px-4 md:py-2 rounded-lg border-2 md:border-4 border-black min-w-[170px] sm:min-w-[210px] md:min-w-[290px] flex items-center justify-between gap-2.5 text-left">
              <div className="min-w-0 flex-grow">
                <div className="text-[8px] md:text-[10px] opacity-75 font-mono uppercase font-black text-brand-green">FM 108.9 MHz</div>
                <div className="text-[10px] md:text-xs font-mono truncate uppercase tracking-widest text-brand-yellow font-black mt-0.5">
                  {currentTrack 
                    ? `${isPlaying ? 'SONANDO' : 'PAUSADO'}: ${currentTrack.title}` 
                    : 'STATUS: READY'
                  }
                </div>
              </div>
              
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  togglePlay();
                }}
                className={`flex-shrink-0 flex items-center justify-center p-1 md:p-1.5 rounded-md transition-all cursor-pointer border active:scale-90 ${
                  isPlaying 
                    ? 'bg-brand-yellow text-black border-brand-yellow hover:bg-brand-yellow/80 shadow-[0_0_8px_rgba(248,251,2,0.3)]' 
                    : 'bg-neutral-800 text-neutral-400 border-white/10 hover:bg-neutral-700 hover:text-white'
                }`}
                title={isPlaying ? "Pausar Emisión" : "Reproducir Emisión"}
              >
                {isPlaying ? <Pause size={11} className="fill-current" /> : <Play size={11} className="fill-current ml-[0.5px]" />}
              </button>

              <button 
                onClick={(e) => {
                  e.preventDefault();
                  toggleMute();
                }}
                className={`flex-shrink-0 flex items-center justify-center p-1 md:p-1.5 rounded-md transition-all cursor-pointer border active:scale-90 ${
                  isMuted 
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                    : 'bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30 shadow-[0_0_8px_rgba(57,255,20,0.2)]'
                }`}
                title={isMuted ? "Quitar Silencio" : "Silenciar Radio"}
              >
                {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>
            </div>

            {/* ACTION LINKS */}
            <div className="flex items-center gap-1.5 md:gap-3">
              {user && (
                <Link to="/ecosystem" className="chrome-button flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-3 rounded-lg md:rounded-xl text-black font-black uppercase text-[8px] md:text-[10px] shadow-lg hover:scale-105 transition-all">
                  <Gamepad2 size={11} />
                  <span>MISIONES</span>
                </Link>
              )}

              {(isAdmin || profile?.role === 'artist') && (
                <Link to="/upload" className="chrome-button flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-3 rounded-lg md:rounded-xl text-black font-black uppercase text-[8px] md:text-[10px] shadow-lg hover:scale-105 transition-all">
                  <Upload size={11} />
                  <span className="hidden md:inline">SUBIR</span>
                </Link>
              )}

              {isAdmin && (
                <Link to="/admin" className="chrome-button flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-3 rounded-lg md:rounded-xl text-black font-black uppercase text-[8px] md:text-[10px] shadow-lg hover:scale-105 transition-all">
                  <ShieldCheck size={11} />
                  <span className="hidden md:inline">ADMIN</span>
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-1.5 md:gap-3">
                  <Link to="/settings" className="flex items-center gap-1.5 md:gap-3 bg-black/30 p-1 md:p-1.5 md:pr-3.5 rounded-lg md:rounded-2xl border-2 md:border-4 border-black group">
                    <img 
                      src={profile?.photoURL || user.photoURL || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'} 
                      className="w-5 h-5 md:w-9 md:h-9 rounded-lg border border-brand-yellow group-hover:scale-110 transition-transform object-cover" 
                      alt="avatar" 
                    />
                    <div className="hidden sm:block text-left">
                      <p className="text-[8px] md:text-[9px] font-black uppercase italic leading-none">
                        {(profile?.displayName || user.displayName || 'Miembro')?.split(' ')[0]}
                      </p>
                      <p className="text-[7px] text-brand-yellow font-bold uppercase tracking-widest">
                        {profile?.role || (isAdmin ? 'Admin' : 'Fan')}
                      </p>
                    </div>
                  </Link>
                  <button 
                    onClick={() => logoutUser()} 
                    className="chrome-button px-2.5 py-1.5 md:px-4 md:py-3 rounded-lg md:rounded-xl text-black font-black uppercase text-[8px] md:text-[10px] shadow-lg hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                    title="Cerrar Sesión"
                  >
                    <LogOut size={11} />
                    <span className="hidden md:inline">SALIR</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin} 
                  disabled={isLoginPending}
                  className="chrome-button px-3.5 py-1.5 md:px-5 md:py-3 rounded-lg md:rounded-xl text-black font-black uppercase text-[9px] md:text-xs shadow-lg hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoginPending ? 'LOGGING...' : 'LOGIN'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* RADIO STRIP */}
      <RadioStrip />

      {/* MAIN VIEW CONTENT */}
      <main className="pt-28 md:pt-40 relative z-10 flex-grow pb-8 md:pb-12">
        <Suspense fallback={<div className="p-20 text-center animate-pulse text-brand-yellow font-black uppercase tracking-widest">CARGANDO MÓDULO...</div>}>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/game" element={<GameView />} />
            <Route path="/ecosystem" element={<EcosystemView />} />
            <Route path="/admin" element={isAdmin ? <AdminView /> : <Navigate to="/" />} />
            <Route path="/artists" element={<ArtistsView />} />
            <Route path="/profile/:id" element={<ArtistProfileView />} />
            <Route path="/profile-setup" element={<ProfileSetupView />} />
            <Route path="/settings" element={<ProfileSettingsView />} />
            <Route path="/upload" element={(isAdmin || profile?.role === 'artist') ? <UploadTrackView /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>

      <div className="relative z-10 w-full mt-auto">
        <Footer />
      </div>

      <MobileNav />
    </div>
  );
};

export default App;
