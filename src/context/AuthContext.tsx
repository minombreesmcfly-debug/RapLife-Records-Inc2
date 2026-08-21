import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  setProfile: React.Dispatch<React.SetStateAction<any | null>>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, isAdmin: false, setProfile: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        // Restore local cached profile immediately for instantaneous page rendering on refresh
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
            
            // Seed 150k points once to the admin if not already seeded
            if (u.email?.toLowerCase() === 'minombreesmcfly@gmail.com' && !data.adminPointsSeeded) {
              setDoc(docRef, { points: 150000, adminPointsSeeded: true }, { merge: true })
                .catch(err => console.error("Error seeding admin points:", err));
            }
          } else {
            // Auto-create initial profile doc IF missing in Firestore
            const isUserAdmin = u.email?.toLowerCase() === 'minombreesmcfly@gmail.com';
            const newUserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || u.email?.split('@')[0] || 'Miembro RapLife',
              artistName: u.displayName || u.email?.split('@')[0] || 'Miembro RapLife',
              photoURL: u.photoURL || '',
              avatarUrl: u.photoURL || '',
              role: isUserAdmin ? 'admin' : 'artist',
              mainCategory: isUserAdmin ? 'Admin' : 'Artista',
              points: isUserAdmin ? 150000 : 100,
              xp: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            setDoc(docRef, newUserProfile, { merge: true })
              .catch(err => console.error("Error auto-creating Firestore user doc:", err));
            setProfile(newUserProfile);
            try {
              localStorage.setItem(localCacheKey, JSON.stringify(newUserProfile));
            } catch (_) {}
          }
          setLoading(false);
        }, (err) => {
          console.error("AuthContext real-time profile listener error:", err);
          setLoading(false);
        });
      } else {
        setProfile(null);
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
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
