import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { listMyTeams, createTeam as apiCreateTeam, joinTeamByCode as apiJoinTeamByCode, removeTeamMember } from '@/lib/api/teams';
import { getGoalkeeperByProfile, createGoalkeeperForProfile } from '@/lib/api/goalkeepers';
import type { Profile, Team } from '@/types/database';

const CURRENT_TEAM_KEY = 'currentTeamId';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  teams: Team[];
  currentTeam: Team | null;
  myGoalkeeperId: string | null;
  setCurrentTeam: (team: Team) => void;
  createTeam: (name: string) => Promise<{ error: string | null }>;
  joinTeam: (code: string) => Promise<{ error: string | null }>;
  leaveTeam: () => Promise<{ error: string | null }>;
  refreshTeams: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'preparatore' | 'portiere',
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
  const [myGoalkeeperId, setMyGoalkeeperId] = useState<string | null>(null);

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

  // Load or auto-create goalkeeper record for portiere users
  async function loadMyGoalkeeper(teamId: string, userId: string, userProfile: Profile | null) {
    const role = userProfile?.role ?? session?.user?.user_metadata?.role;
    if (role === 'admin' || role === 'preparatore') {
      setMyGoalkeeperId(null);
      return;
    }
    try {
      let gk = await getGoalkeeperByProfile(teamId, userId);
      if (!gk) {
        const name = userProfile?.full_name ?? session?.user?.user_metadata?.full_name ?? '';
        gk = await createGoalkeeperForProfile(name || 'Portiere', teamId, userId);
      }
      setMyGoalkeeperId(gk.id);
    } catch {
      setMyGoalkeeperId(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        await Promise.all([loadProfile(initialSession.user.id), loadTeams()]);
        setLoading(false);
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
        setMyGoalkeeperId(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // When currentTeam or profile changes, load goalkeeper for portiere
  useEffect(() => {
    if (currentTeam && session) {
      loadMyGoalkeeper(currentTeam.id, session.user.id, profile);
    }
  }, [currentTeam?.id, profile?.role]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: 'preparatore' | 'portiere',
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
    if (!session) return { error: i18n.t('auth.notAuthenticated') };
    try {
      const team = await apiCreateTeam(name, session.user.id);
      const updated = [...teams, team];
      setTeams(updated);
      setCurrentTeamState(team);
      await AsyncStorage.setItem(CURRENT_TEAM_KEY, team.id);
      return { error: null };
    } catch (e: unknown) {
      return { error: (e as any)?.message ?? String(e) };
    }
  }

  async function joinTeam(code: string) {
    try {
      const result = await apiJoinTeamByCode(code);
      if (result !== 'ok') return { error: result };
      await loadTeams();
      return { error: null };
    } catch (e: unknown) {
      return { error: (e as any)?.message ?? String(e) };
    }
  }

  async function leaveTeam() {
    if (!session || !currentTeam) return { error: 'No team' };
    try {
      await removeTeamMember(currentTeam.id, session.user.id);
      const updated = teams.filter((t) => t.id !== currentTeam.id);
      setTeams(updated);
      setCurrentTeamState(updated[0] ?? null);
      setMyGoalkeeperId(null);
      await AsyncStorage.removeItem(CURRENT_TEAM_KEY);
      return { error: null };
    } catch (e: unknown) {
      return { error: (e as any)?.message ?? String(e) };
    }
  }

  const role = profile?.role ?? session?.user?.user_metadata?.role;
  const isAdmin = role === 'admin' || role === 'preparatore';

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin,
        loading,
        teams,
        currentTeam,
        myGoalkeeperId,
        setCurrentTeam,
        createTeam,
        joinTeam,
        leaveTeam,
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
