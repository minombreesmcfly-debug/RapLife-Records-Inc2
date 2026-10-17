import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  setProfile: (profile: any) => void;
  loginAsDemo?: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  setProfile: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loginAsDemo = () => {
    const demoProfile = {
      uid: 'demo_user_1',
      id: 'demo_user_1',
      email: 'demo@raplife.com',
      displayName: 'Fan RapLife',
      role: 'fan',
      mainCategory: 'Community',
      points: 250,
      xp: 120,
      createdAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('raplife_demo_session', JSON.stringify(demoProfile));
    } catch (_) {}
    setUser({
      uid: 'demo_user_1',
      email: 'demo@raplife.com',
      displayName: 'Fan RapLife'
    } as any);
    setProfile(demoProfile);
    setLoading(false);
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        const localCacheKey = `raplife_profile_${u.uid}`;
        try {
          const cached = localStorage.getItem(localCacheKey);
          if (cached) {
            setProfile(JSON.parse(cached));
          }
        } catch (e) {
          console.warn("Could not parse local cached profile:", e);
        }

        const docRef = doc(db, 'users', u.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(data);
            try {
              localStorage.setItem(localCacheKey, JSON.stringify(data));
            } catch (_) {}

            if (u.email?.toLowerCase() === 'minombreesmcfly@gmail.com' && !data.adminPointsSeeded) {
              setDoc(docRef, { points: 150000, adminPointsSeeded: true }, { merge: true })
                .catch(err => console.warn("Error seeding admin points:", err));
            }

            try {
              fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: u.uid, uid: u.uid, ...data, email: u.email || data.email })
              }).catch(() => {});
            } catch (_) {}
          } else {
            const isUserAdmin = u.email?.toLowerCase() === 'minombreesmcfly@gmail.com' || u.email?.toLowerCase() === 'macfly@gmail.com';
            const newUserProfile = {
              uid: u.uid,
              id: u.uid,
              email: u.email || '',
              displayName: u.displayName || u.email?.split('@')[0] || 'Miembro RapLife',
              artistName: u.displayName || u.email?.split('@')[0] || 'Miembro RapLife',
              photoURL: u.photoURL || '',
              avatarUrl: u.photoURL || '',
              role: isUserAdmin ? 'admin' : 'artist',
              mainCategory: isUserAdmin ? 'Admin' : 'Artista',
              points: isUserAdmin ? 150000 : 100,
              xp: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setDoc(docRef, newUserProfile, { merge: true })
              .catch(err => console.warn("Notice auto-creating Firestore user doc:", err));
            setProfile(newUserProfile);
            try {
              localStorage.setItem(localCacheKey, JSON.stringify(newUserProfile));
            } catch (_) {}

            try {
              fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserProfile)
              }).catch(() => {});
            } catch (_) {}
          }
          setLoading(false);
        }, (err) => {
          console.warn("AuthContext real-time profile listener notice:", err?.message || err);
          const isUserAdmin = u.email?.toLowerCase() === 'minombreesmcfly@gmail.com' || u.email?.toLowerCase() === 'macfly@gmail.com';
          const fallbackProfile = {
            uid: u.uid,
            id: u.uid,
            email: u.email || '',
            displayName: u.displayName || u.email?.split('@')[0] || 'Miembro RapLife',
            artistName: u.displayName || u.email?.split('@')[0] || 'Miembro RapLife',
            photoURL: u.photoURL || '',
            avatarUrl: u.photoURL || '',
            role: isUserAdmin ? 'admin' : 'artist',
            mainCategory: isUserAdmin ? 'Admin' : 'Artista',
            points: isUserAdmin ? 150000 : 100,
            xp: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setProfile(fallbackProfile);
          try {
            fetch('/api/register-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fallbackProfile)
            }).catch(() => {});
          } catch (_) {}
          setLoading(false);
        });
      } else {
        try {
          const hasDemo = localStorage.getItem('raplife_demo_session');
          if (hasDemo) {
            const parsed = JSON.parse(hasDemo);
            setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.displayName } as any);
            setProfile(parsed);
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (_) {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const isAdmin = 
    profile?.role === 'admin' || 
    user?.email?.toLowerCase() === 'minombreesmcfly@gmail.com' ||
    user?.email?.toLowerCase() === 'macfly@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, setProfile, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
