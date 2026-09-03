import { supabase } from '@/lib/supabase';
import type { Match } from '@/types/database';

function stripNotes(match: Match): Match {
  return { ...match, notes: null, result_notes: null };
}

export async function listMatches(teamId: string, opts?: { isAdmin?: boolean }): Promise<Match[]> {
  const { data, error } = await supabase.from('matches').select('*').eq('team_id', teamId).order('match_date');
  if (error) throw error;
  return opts?.isAdmin ? data : data.map(stripNotes);
}

export async function getMatch(id: string, opts?: { isAdmin?: boolean }): Promise<Match> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
  if (error) throw error;
  return opts?.isAdmin ? data : stripNotes(data);
}

export interface MatchInput {
  opponent: string;
  is_home: boolean;
  match_date: string;
  match_time: string | null;
  match_type: 'amichevole' | 'campionato' | 'coppa';
  matchday: number | null;
  goals_scored: number | null;
  goals_conceded: number | null;
  rating: number | null;
  result: string | null;
  result_notes: string | null;
  notes: string | null;
}

export async function createMatch(input: MatchInput, createdBy: string, teamId: string) {
  const { error } = await supabase.from('matches').insert({ ...input, created_by: createdBy, team_id: teamId });
  if (error) throw error;
}

export async function updateMatch(id: string, input: MatchInput) {
  const { error } = await supabase.from('matches').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteMatch(id: string) {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}
