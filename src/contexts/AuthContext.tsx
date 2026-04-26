import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, nickname: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data as Profile | null;
}

function profileFromUser(user: User): Profile {
  const metadata = user.user_metadata ?? {};
  const username = (metadata.user_name as string | undefined)
    || (metadata.preferred_username as string | undefined)
    || user.email?.split('@')[0]
    || 'you';
  const nickname = (metadata.full_name as string | undefined)
    || (metadata.name as string | undefined)
    || username;
  const avatarUrl = (metadata.avatar_url as string | undefined)
    || (metadata.picture as string | undefined)
    || null;

  return {
    id: user.id,
    username,
    nickname,
    bio: null,
    avatar_url: avatarUrl,
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
  };
}

function mergeProfileFallback(profile: Profile | null, fallback: Profile): Profile {
  if (!profile) return fallback;

  return {
    ...fallback,
    ...profile,
    username: profile.username || fallback.username,
    nickname: profile.nickname || fallback.nickname,
    avatar_url: profile.avatar_url || fallback.avatar_url,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((error) => {
        console.error('Failed to restore auth session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (!user) {
      setProfile(null);
      return;
    }

    const fallbackProfile = profileFromUser(user);
    setProfile((currentProfile) => mergeProfileFallback(currentProfile, fallbackProfile));

    fetchProfile(user.id).then((nextProfile) => {
      if (isCurrent) setProfile(mergeProfileFallback(nextProfile, fallbackProfile));
    });

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, nickname: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
        options: {
        data: { full_name: nickname },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) setProfile(await fetchProfile(user.id));
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
