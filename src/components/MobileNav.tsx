import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Gamepad2, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const navItems = [
    { label: 'Inicio', path: '/', icon: Home },
    { label: 'Artistas', path: '/artists', icon: Users },
    ...(user ? [{ label: 'Misiones', path: '/ecosystem', icon: Gamepad2 }] : []),
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
    ...(user ? [{ label: 'Perfil', path: '/settings', icon: Settings }] : [])
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-white/10 px-3 py-2 flex items-center justify-around backdrop-blur-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-all ${
              isActive ? 'text-brand-yellow scale-105' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
