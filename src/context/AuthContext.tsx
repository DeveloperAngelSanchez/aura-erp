import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../api/supabaseClient';
import type { UserRole } from '../config/rubrosConfig';

export interface Profile {
  id: string;
  sucursal_id: string | null;
  nombre: string;
  rol: UserRole;
  rol_sistema: 'sistema_admin' | null;
  creado_en: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let initialized = false;

    // Check active session on initial startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => {
          setLoading(false);
          initialized = true;
        });
      } else {
        setProfile(null);
        setLoading(false);
        initialized = true;
      }
    });

    // Listen for auth changes in background
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore INITIAL_SESSION if getSession already handled startup
        if (event === 'INITIAL_SESSION' && initialized) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // If already initialized, update profile in background without resetting loading=true
          if (!initialized) {
            setLoading(true);
            await fetchProfile(currentUser.id);
            setLoading(false);
            initialized = true;
          } else {
            // Background update without unmounting app tree
            await fetchProfile(currentUser.id);
          }
        } else {
          setProfile(null);
          setLoading(false);
          initialized = true;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
