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
  loginAsDemo: (email?: string, name?: string, role?: string) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isAdmin: false, 
  setProfile: () => {},
  loginAsDemo: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loginAsDemo = (
    email: string = 'minombreesmcfly@gmail.com', 
    name: string = 'McFly (Admin)', 
    role: string = 'admin'
  ) => {
    const isUserAdmin = role === 'admin' || email.toLowerCase() === 'minombreesmcfly@gmail.com';
    const demoUser: any = {
      uid: 'admin_mcfly_preview',
      email,
      displayName: name,
      photoURL: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
      emailVerified: true
    };
    const demoProfile: any = {
      uid: demoUser.uid,
      email,
      displayName: name,
      artistName: name,
      photoURL: demoUser.photoURL,
      avatarUrl: demoUser.photoURL,
      role: isUserAdmin ? 'admin' : role,
      mainCategory: isUserAdmin ? 'Admin' : 'Artista',
      points: 150000,
      xp: 1000
    };
    setUser(demoUser);
    setProfile(demoProfile);
    setLoading(false);
    try {
      localStorage.setItem('raplife_demo_session', JSON.stringify({ user: demoUser, profile: demoProfile }));
    } catch (_) {}
  };

  useEffect(() => {
    // Check for local demo session if offline or in iframe sandbox
    try {
      const savedDemo = localStorage.getItem('raplife_demo_session');
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo);
        if (parsed.user && parsed.profile) {
          setUser(parsed.user);
          setProfile(parsed.profile);
        }
      }
    } catch (_) {}

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          localStorage.removeItem('raplife_demo_session');
        } catch (_) {}
      }
      
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
                .catch(err => console.warn("Error seeding admin points:", err));
            }

            // Sync with server registry for instant admin visibility
            try {
              fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: u.uid, uid: u.uid, ...data, email: u.email || data.email })
              }).catch(() => {});
            } catch (_) {}
          } else {
            // Auto-create initial profile doc IF missing in Firestore
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

            // Immediately register with server registry
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
          
          // Fallback if firestore listener is offline or fails: still register user with server
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
        // If no Firebase user and no demo session
        try {
          const hasDemo = localStorage.getItem('raplife_demo_session');
          if (!hasDemo) {
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
