import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { listMyTeams, createTeam as apiCreateTeam, joinTeamByCode as apiJoinTeamByCode } from '@/lib/api/teams';
import type { Profile, Team } from '@/types/database';

const CURRENT_TEAM_KEY = 'currentTeamId';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  teams: Team[];
  currentTeam: Team | null;
  setCurrentTeam: (team: Team) => void;
  createTeam: (name: string) => Promise<{ error: string | null }>;
  joinTeam: (code: string) => Promise<{ error: string | null }>;
  refreshTeams: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'portiere',
    inviteCode?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data as Profile);
  }

  async function loadTeams() {
    try {
      const myTeams = await listMyTeams();
      setTeams(myTeams);
      const storedId = await AsyncStorage.getItem(CURRENT_TEAM_KEY);
      const found = storedId ? myTeams.find((t) => t.id === storedId) : null;
      setCurrentTeamState(found ?? myTeams[0] ?? null);
    } catch {
      setTeams([]);
    }
  }

  async function setCurrentTeam(team: Team) {
    setCurrentTeamState(team);
    await AsyncStorage.setItem(CURRENT_TEAM_KEY, team.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        Promise.all([loadProfile(initialSession.user.id), loadTeams()]).finally(() =>
          setLoading(false)
        );
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
        loadTeams();
      } else {
        setProfile(null);
        setTeams([]);
        setCurrentTeamState(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'portiere',
    inviteCode?: string
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) return { error: error.message };
    if (data.user && fullName.trim()) {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', data.user.id);
    }
    if (inviteCode) {
      const result = await apiJoinTeamByCode(inviteCode);
      if (result !== 'ok') return { error: result };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(CURRENT_TEAM_KEY);
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  async function refreshTeams() {
    await loadTeams();
  }

  async function createTeam(name: string) {
    if (!profile) return { error: 'Non autenticato' };
    try {
      const team = await apiCreateTeam(name, profile.id);
      const updated = [...teams, team];
      setTeams(updated);
      setCurrentTeamState(team);
      await AsyncStorage.setItem(CURRENT_TEAM_KEY, team.id);
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Errore sconosciuto' };
    }
  }

  async function joinTeam(code: string) {
    try {
      const result = await apiJoinTeamByCode(code);
      if (result !== 'ok') return { error: result };
      await loadTeams();
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Errore sconosciuto' };
    }
  }

  const isAdmin =
    profile?.role === 'admin' || session?.user?.user_metadata?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin,
        loading,
        teams,
        currentTeam,
        setCurrentTeam,
        createTeam,
        joinTeam,
        refreshTeams,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
