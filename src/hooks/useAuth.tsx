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
  activeRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ needsEmailConfirmation: boolean }>;
  selectRole: (role: UserRole) => Promise<void>;
  returnToRoleSelect: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
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
      // Always ask for role on app launch, even if the account already has one saved.
      setActiveRole(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);

      if (
        !nextSession ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_OUT'
      ) {
        setActiveRole(null);
      }
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

  const returnToRoleSelect = useCallback(() => {
    setActiveRole(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setActiveRole(null);
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
        const { error: washerError } = await supabase.from('washer_profiles').upsert(
          {
            user_id: authUser.id,
            is_available: false,
          },
          { onConflict: 'user_id' },
        );
        if (washerError) throw washerError;
      }

      setActiveRole(role);
      await refreshProfile();
    },
    [authUser, refreshProfile],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setActiveRole(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      authUser,
      profile,
      activeRole,
      loading,
      signIn,
      signUp,
      selectRole,
      returnToRoleSelect,
      signOut,
      refreshProfile,
    }),
    [session, authUser, profile, activeRole, loading, signIn, signUp, selectRole, returnToRoleSelect, signOut, refreshProfile],
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
