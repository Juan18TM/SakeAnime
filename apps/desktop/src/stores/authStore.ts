import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  init: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const profile = session?.user ? await fetchProfile(session.user.id) : null;
    set({ session, user: session?.user ?? null, profile, initialized: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      set({ session, user: session?.user ?? null, profile });
    });
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Supabase no está configurado. Revisa tu archivo .env' };
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false });
      return { error: error.message };
    }
    const profile = data.user ? await fetchProfile(data.user.id) : null;
    set({ user: data.user, session: data.session, profile, loading: false });
    return { error: null };
  },

  signUp: async (email, password, username) => {
    if (!supabase) return { error: 'Supabase no está configurado. Revisa tu archivo .env' };
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) {
      set({ loading: false });
      return { error: error.message };
    }
    const profile = data.user ? await fetchProfile(data.user.id) : null;
    set({ user: data.user, session: data.session, profile, loading: false });
    return { error: null };
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user || !supabase) return;
    const profile = await fetchProfile(user.id);
    set({ profile });
  },
}));
