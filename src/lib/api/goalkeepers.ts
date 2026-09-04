import { supabase } from '@/lib/supabase';
import type { Goalkeeper } from '@/types/database';

export async function listGoalkeepers(teamId: string): Promise<Goalkeeper[]> {
  const { data, error } = await supabase
    .from('goalkeepers')
    .select('*')
    .eq('team_id', teamId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createGoalkeeper(name: string, teamId: string, createdBy: string): Promise<Goalkeeper> {
  const { data, error } = await supabase
    .from('goalkeepers')
    .insert({ name, team_id: teamId, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoalkeeper(id: string, name: string) {
  const { error } = await supabase.from('goalkeepers').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteGoalkeeper(id: string) {
  const { error } = await supabase.from('goalkeepers').delete().eq('id', id);
  if (error) throw error;
}

export async function getGoalkeeperByProfile(teamId: string, profileId: string): Promise<Goalkeeper | null> {
  const { data, error } = await supabase
    .from('goalkeepers')
    .select('*')
    .eq('team_id', teamId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createGoalkeeperForProfile(name: string, teamId: string, profileId: string): Promise<Goalkeeper> {
  const { data, error } = await supabase
    .from('goalkeepers')
    .insert({ name, team_id: teamId, profile_id: profileId, created_by: profileId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
