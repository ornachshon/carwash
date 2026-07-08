import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { User, UserRole } from '../types/database';
import { getErrorMessage } from '../utils/authErrors';

interface AuthContextValue {
  session: Session | null;
  authUser: AuthUser | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ needsEmailConfirmation: boolean }>;
  selectRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return null;
    }

    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authUser) {
      setProfile(null);
      return;
    }
    const data = await fetchProfile(authUser.id);
    setProfile(data);
  }, [authUser, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthUser(currentSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    fetchProfile(authUser.id).then(setProfile);
  }, [authUser, fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, phone: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (error) {
        console.error('[useAuth] auth.signUp failed:', getErrorMessage(error), error);
        throw error;
      }

      return { needsEmailConfirmation: data.session == null };
    },
    [],
  );

  const selectRole = useCallback(
    async (role: UserRole) => {
      if (!authUser) {
        throw new Error('You must be signed in to select a role.');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ role })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      if (role === 'washer') {
        const { error: washerError } = await supabase.from('washer_profiles').insert({
          user_id: authUser.id,
          is_available: false,
        });
        if (washerError) throw washerError;
      }

      await refreshProfile();
    },
    [authUser, refreshProfile],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      authUser,
      profile,
      loading,
      signIn,
      signUp,
      selectRole,
      signOut,
      refreshProfile,
    }),
    [session, authUser, profile, loading, signIn, signUp, selectRole, signOut, refreshProfile],
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

export function hasRole(profile: User | null): profile is User & { role: UserRole } {
  return profile?.role != null;
}
