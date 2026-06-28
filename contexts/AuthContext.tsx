import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'display_name'
    | 'timezone'
    | 'locale'
    | 'bible_translation_id'
    | 'praise_visibility_days'
    | 'onboarding_completed_at'
  >
>;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isEmailVerified: boolean;
  needsOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  resendVerificationEmail: () => Promise<{ error: string | null }>;
  refreshSession: () => Promise<{ error: string | null }>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load profile:', error.message);
    return null;
  }

  return data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setIsProfileLoading(true);
    const nextProfile = await fetchProfile(userId);
    setProfile(nextProfile);
    setIsProfileLoading(false);
    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    await loadProfile(session.user.id);
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    loadProfile(session.user.id);
  }, [loadProfile, session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'prayercare://reset-password',
    });
    return { error: error?.message ?? null };
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!session?.user?.email) {
      return { error: 'No email address found for this account.' };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: session.user.email,
    });

    return { error: error?.message ?? null };
  }, [session?.user?.email]);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      return { error: error.message };
    }
    if (data.session) {
      setSession(data.session);
    }
    return { error: null };
  }, []);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate) => {
      if (!session?.user?.id) {
        return { error: 'You must be signed in to update your profile.' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select('*')
        .single();

      if (error) {
        return { error: error.message };
      }

      setProfile(data);
      return { error: null };
    },
    [session?.user?.id],
  );

  const isEmailVerified = Boolean(session?.user?.email_confirmed_at);
  const needsOnboarding = Boolean(session && isEmailVerified && !profile?.onboarding_completed_at);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isProfileLoading,
      isEmailVerified,
      needsOnboarding,
      signIn,
      signUp,
      signOut,
      resetPassword,
      resendVerificationEmail,
      refreshSession,
      updateProfile,
      refreshProfile,
    }),
    [
      session,
      profile,
      isLoading,
      isProfileLoading,
      isEmailVerified,
      needsOnboarding,
      signIn,
      signUp,
      signOut,
      resetPassword,
      resendVerificationEmail,
      refreshSession,
      updateProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
