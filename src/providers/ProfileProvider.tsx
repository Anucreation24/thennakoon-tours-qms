'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export type UserRole = 'owner' | 'admin' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, we might want to sign out or handle gracefully
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.error('Catch error fetching profile:', e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchProfile(user.id, user.email || '');
    } else {
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let authListener: any = null;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        setProfile(null);
        setLoading(false);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            await fetchProfile(session.user.id, session.user.email || '');
          } else {
            setProfile(null);
            setLoading(false);
            if (pathname !== '/login' && pathname !== '/owner-setup') {
              router.push('/login');
            }
          }
        }
      );
      authListener = subscription;
    };

    initAuth();

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [pathname, router]);

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setProfile(null);
    setLoading(false);
    router.push('/login');
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        role: profile?.role || null,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
