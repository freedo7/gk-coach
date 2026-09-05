import { supabase } from '@/lib/supabase';
import type { Match, MatchPerformance } from '@/types/database';

function stripNotes(match: Match): Match {
  return { ...match, notes: null, result_notes: null };
}

export async function getLatestMatch(teamId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
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
  goalkeeper_id: string | null;
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

export async function createMatch(input: MatchInput, createdBy: string, teamId: string): Promise<string> {
  const { data, error } = await supabase.from('matches').insert({ ...input, created_by: createdBy, team_id: teamId }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMatch(id: string, input: MatchInput) {
  const { error } = await supabase.from('matches').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteMatch(id: string) {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}

// Match performances (multi-goalkeeper)
export async function listPerformances(matchId: string): Promise<MatchPerformance[]> {
  const { data, error } = await supabase
    .from('match_performances')
    .select('*, goalkeeper:goalkeepers(name)')
    .eq('match_id', matchId)
    .order('created_at');
  if (error) throw error;
  return data as unknown as MatchPerformance[];
}

export interface PerformanceInput {
  goalkeeper_id: string;
  rating: number | null;
  notes: string | null;
}

export async function setPerformances(matchId: string, performances: PerformanceInput[]) {
  await supabase.from('match_performances').delete().eq('match_id', matchId);
  if (performances.length === 0) return;
  const rows = performances.map((p) => ({ match_id: matchId, ...p }));
  const { error } = await supabase.from('match_performances').insert(rows);
  if (error) throw error;
}
