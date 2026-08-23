import { supabase } from '@/lib/supabase';
import type { ExerciseCategory } from '@/types/database';

export async function listCategories(): Promise<ExerciseCategory[]> {
  const { data, error } = await supabase
    .from('exercise_categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}
