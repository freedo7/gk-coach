import { supabase } from '@/lib/supabase';
import type { Match } from '@/types/database';

export async function listMatches(): Promise<Match[]> {
  const { data, error } = await supabase.from('matches').select('*').order('match_date');
  if (error) throw error;
  return data;
}

export async function getMatch(id: string): Promise<Match> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
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

export async function createMatch(input: MatchInput, createdBy: string) {
  const { error } = await supabase.from('matches').insert({ ...input, created_by: createdBy });
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
