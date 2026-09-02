import { supabase } from '@/lib/supabase';
import type { Match } from '@/types/database';

const COLUMNS_PUBLIC = 'id, team_id, opponent, is_home, match_date, match_time, match_type, result, created_by, created_at, updated_at';
const COLUMNS_ADMIN = '*';

export async function listMatches(teamId: string, opts?: { isAdmin?: boolean }): Promise<Match[]> {
  const cols = opts?.isAdmin ? COLUMNS_ADMIN : COLUMNS_PUBLIC;
  const { data, error } = await supabase.from('matches').select(cols).eq('team_id', teamId).order('match_date');
  if (error) throw error;
  return data;
}

export async function getMatch(id: string, opts?: { isAdmin?: boolean }): Promise<Match> {
  const cols = opts?.isAdmin ? COLUMNS_ADMIN : COLUMNS_PUBLIC;
  const { data, error } = await supabase.from('matches').select(cols).eq('id', id).single();
  if (error) throw error;
  return data;
}

export interface MatchInput {
  opponent: string;
  is_home: boolean;
  match_date: string;
  match_time: string | null;
  match_type: 'amichevole' | 'campionato' | 'coppa';
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
