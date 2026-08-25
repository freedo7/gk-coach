import { supabase } from '@/lib/supabase';
import type { Exercise, ExerciseCategory } from '@/types/database';

export interface ExerciseWithCategory extends Exercise {
  category: ExerciseCategory;
}

export async function listExercises(): Promise<ExerciseWithCategory[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*, category:exercise_categories(*)')
    .order('title');
  if (error) throw error;
  return data as unknown as ExerciseWithCategory[];
}

export async function getExercise(id: string): Promise<ExerciseWithCategory> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*, category:exercise_categories(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ExerciseWithCategory;
}

export interface ExerciseInput {
  title: string;
  description: string;
  category_id: string;
  video_url: string | null;
  content_url: string | null;
  difficulty: 'base' | 'intermedio' | 'avanzato' | null;
  duration_minutes: number | null;
  equipment: string | null;
}

export async function createExercise(input: ExerciseInput, createdBy: string) {
  const { error } = await supabase.from('exercises').insert({ ...input, created_by: createdBy });
  if (error) throw error;
}

export async function updateExercise(id: string, input: ExerciseInput) {
  const { error } = await supabase.from('exercises').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function listExercisesByCategory(categoryId: string): Promise<ExerciseWithCategory[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*, category:exercise_categories(*)')
    .eq('category_id', categoryId)
    .order('title');
  if (error) throw error;
  return data as unknown as ExerciseWithCategory[];
}
