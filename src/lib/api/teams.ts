import { supabase } from '@/lib/supabase';
import type { Team, TeamMember, Profile } from '@/types/database';

export async function listMyTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createTeam(name: string, coachId: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({ name: name.trim(), coach_id: coachId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function joinTeamByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_team_by_code', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as string; // 'ok' or error message
}

export async function generateInviteCode(teamId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_invite_code', { p_team_id: teamId });
  if (error) throw error;
  return data as string;
}

export interface TeamMemberWithProfile extends TeamMember {
  profile: Profile;
}

export async function listTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, profile:profiles(*)')
    .eq('team_id', teamId);
  if (error) throw error;
  return data as unknown as TeamMemberWithProfile[];
}

export async function removeTeamMember(teamId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('profile_id', profileId);
  if (error) throw error;
}
