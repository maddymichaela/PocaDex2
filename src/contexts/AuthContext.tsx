import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, UserIdentity } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export const BIO_MAX_LENGTH = 240;

interface ProfileUpdates {
  nickname: string;
  username: string;
  bio?: string;
  avatarDataUrl?: string | null;
  isCollectionPublic?: boolean;
  isWishlistPublic?: boolean;
  isBioPublic?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, nickname: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ error: string | null }>;
  checkUsernameAvailability: (username: string) => Promise<{ available: boolean; error: string | null; normalized: string }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  unlinkGoogleAccount: () => Promise<{ error: string | null }>;
  requestAccountDeletion: () => Promise<{ error: string | null }>;
  cancelAccountDeletion: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-z0-9_-]{3,24}$/.test(username);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data as Profile | null;
}

async function uploadAvatar(userId: string, dataUrl: string): Promise<string> {
  const [header, base64] = dataUrl.split(',');
  const mime = header.split(':')[1]?.split(';')[0] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const ext = mime.split('/')[1] || 'jpg';
  const filename = `avatars/${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('photocard-images').upload(filename, blob, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('photocard-images').getPublicUrl(filename);
  return data.publicUrl;
}

function isMissingProfileColumnError(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) return false;
  const message = String((error as { message: unknown }).message);
  return (
    message.includes("Could not find the 'display_name' column") ||
    message.includes("Could not find the 'is_collection_public' column") ||
    message.includes("Could not find the 'is_wishlist_public' column") ||
    message.includes("Could not find the 'is_bio_public' column")
  );
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
    display_name: nickname,
    bio: null,
    avatar_url: avatarUrl,
    is_collection_public: true,
    is_wishlist_public: true,
    is_bio_public: true,
    has_password: Boolean(metadata.has_password || metadata.password_set_at),
    deletion_requested_at: (metadata.deletion_requested_at as string | undefined) ?? null,
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
    is_collection_public: profile.is_collection_public ?? true,
    is_wishlist_public: profile.is_wishlist_public ?? true,
    is_bio_public: profile.is_bio_public ?? true,
    has_password: profile.has_password ?? fallback.has_password ?? null,
    deletion_requested_at: profile.deletion_requested_at ?? fallback.deletion_requested_at ?? null,
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

  const updateProfile = async (updates: ProfileUpdates) => {
    if (!user) return { error: 'You need to be signed in to update your profile.' };

    const username = normalizeUsername(updates.username);
    const nickname = updates.nickname.trim();
    if (!isValidUsername(username)) {
      return { error: 'Usernames must be 3-24 characters and can only use letters, numbers, underscores, or hyphens.' };
    }
    if (nickname.length < 2) return { error: 'Display name must be at least 2 characters.' };
    const bio = updates.bio?.trim() ?? profile?.bio ?? '';
    if (bio.length > BIO_MAX_LENGTH) return { error: `Bio must be ${BIO_MAX_LENGTH} characters or fewer.` };

    const { data: duplicate, error: duplicateError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle();
    if (duplicateError) return { error: duplicateError.message };
    if (duplicate) return { error: 'That username is already taken.' };

    try {
      const avatarUrl = updates.avatarDataUrl?.startsWith('data:')
        ? await uploadAvatar(user.id, updates.avatarDataUrl)
        : profile?.avatar_url ?? null;
      const nextProfile: Profile = {
        id: user.id,
        username,
        nickname,
        display_name: nickname,
        bio: bio || null,
        avatar_url: avatarUrl,
        is_collection_public: updates.isCollectionPublic ?? profile?.is_collection_public ?? true,
        is_wishlist_public: updates.isWishlistPublic ?? profile?.is_wishlist_public ?? true,
        is_bio_public: updates.isBioPublic ?? profile?.is_bio_public ?? true,
        has_password: profile?.has_password ?? null,
        deletion_requested_at: profile?.deletion_requested_at ?? null,
        created_at: profile?.created_at ?? user.created_at,
        updated_at: new Date().toISOString(),
      };

      const profileRow = {
        id: user.id,
        username,
        nickname,
        display_name: nickname,
        bio: nextProfile.bio,
        avatar_url: avatarUrl,
        is_collection_public: nextProfile.is_collection_public,
        is_wishlist_public: nextProfile.is_wishlist_public,
        is_bio_public: nextProfile.is_bio_public,
        updated_at: nextProfile.updated_at,
      };

      const { error: profileError } = await supabase.from('profiles').upsert(profileRow);
      if (profileError && isMissingProfileColumnError(profileError)) {
        const { error: legacyProfileError } = await supabase.from('profiles').upsert({
          id: user.id,
          username,
          nickname,
          bio: nextProfile.bio,
          avatar_url: avatarUrl,
          updated_at: nextProfile.updated_at,
        });
        if (legacyProfileError) return { error: legacyProfileError.message };
      } else if (profileError) {
        return { error: profileError.message };
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: nickname, name: nickname, user_name: username, preferred_username: username, avatar_url: avatarUrl },
      });
      if (authError) return { error: authError.message };

      setProfile(nextProfile);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update profile.' };
    }
  };

  const checkUsernameAvailability = async (nextUsername: string) => {
    if (!user) return { available: false, error: 'You need to be signed in to update your profile.', normalized: normalizeUsername(nextUsername) };
    const normalized = normalizeUsername(nextUsername);
    if (!isValidUsername(normalized)) {
      return { available: false, error: 'Use 3-24 letters, numbers, underscores, or hyphens.', normalized };
    }
    if (normalized === normalizeUsername(profile?.username ?? '')) {
      return { available: true, error: null, normalized };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', normalized)
      .neq('id', user.id)
      .maybeSingle();
    if (error) return { available: false, error: error.message, normalized };
    return { available: !data, error: null, normalized };
  };

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: { ...(user?.user_metadata ?? {}), has_password: true, password_set_at: new Date().toISOString() },
    });
    if (user && !error) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_password: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (profileError) console.warn('Failed to persist password status on profile row:', profileError);
      setProfile((current) => current ? { ...current, has_password: true } : current);
    }
    if (data.user) setUser(data.user);
    return { error: error?.message ?? null };
  };

  const hasPasswordLogin = (identities: UserIdentity[]) => {
    const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
    return (
      providers.includes('email') ||
      identities.some((identity) => identity.provider === 'email') ||
      Boolean(user?.user_metadata?.password_set_at)
    );
  };

  const unlinkGoogleAccount = async () => {
    if (!user) return { error: 'You need to be signed in to unlink Google.' };

    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) return { error: error.message };

    const identities = data.identities ?? [];
    const googleIdentity = identities.find((identity) => identity.provider === 'google');
    if (!googleIdentity) return { error: 'No linked Google account was found.' };
    if (!hasPasswordLogin(identities)) {
      return { error: 'Set a password before unlinking Google.' };
    }
    if (identities.length < 2) {
      return { error: 'Supabase requires another linked login method before Google can be unlinked.' };
    }

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
    if (unlinkError) return { error: unlinkError.message };

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) setUser(userData.user);
    return { error: null };
  };

  const setDeletionRequest = async (requestedAt: string | null) => {
    if (!user) return { error: 'You need to be signed in to manage deletion.' };

    const { error: authError } = await supabase.auth.updateUser({
      data: { ...(user.user_metadata ?? {}), deletion_requested_at: requestedAt },
    });
    if (authError) return { error: authError.message };

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ deletion_requested_at: requestedAt, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (profileError) console.warn('Failed to persist deletion status on profile row:', profileError);

    setProfile((current) => current ? { ...current, deletion_requested_at: requestedAt } : current);
    return { error: null };
  };

  const requestAccountDeletion = async () => setDeletionRequest(new Date().toISOString());
  const cancelAccountDeletion = async () => setDeletionRequest(null);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) setProfile(await fetchProfile(user.id));
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail, updateProfile, checkUsernameAvailability,
      updateEmail, updatePassword, unlinkGoogleAccount, requestAccountDeletion, cancelAccountDeletion,
      signOut, refreshProfile,
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
