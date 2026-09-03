import { supabase } from '@/lib/supabase';
import type { Training, TrainingExercise, Exercise } from '@/types/database';

export interface TrainingExerciseWithExercise extends TrainingExercise {
  exercise: Exercise;
}

export interface TrainingWithExercises extends Training {
  training_exercises: TrainingExerciseWithExercise[];
}

export async function listTrainings(teamId: string): Promise<Training[]> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*')
    .eq('team_id', teamId)
    .order('training_date');
  if (error) throw error;
  return data;
}

export async function getTraining(id: string): Promise<TrainingWithExercises> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*, training_exercises(*, exercise:exercises(*))')
    .eq('id', id)
    .order('position', { referencedTable: 'training_exercises' })
    .single();
  if (error) throw error;
  return data as unknown as TrainingWithExercises;
}

export async function getTrainingByDate(date: string, teamId: string): Promise<TrainingWithExercises | null> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*, training_exercises(*, exercise:exercises(*))')
    .eq('training_date', date)
    .eq('team_id', teamId)
    .order('position', { referencedTable: 'training_exercises' })
    .maybeSingle();
  if (error) throw error;
  return data as unknown as TrainingWithExercises | null;
}

export interface TrainingInput {
  goalkeeper_id: string | null;
  training_date: string;
  training_time: string | null;
  title: string;
  notes: string | null;
}

export async function createTraining(input: TrainingInput, createdBy: string, teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('trainings')
    .insert({ ...input, created_by: createdBy, team_id: teamId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateTraining(id: string, input: TrainingInput) {
  const { error } = await supabase.from('trainings').update(input).eq('id', id);
  if (error) throw error;
}

export async function toggleTrainingCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from('trainings').update({ completed }).eq('id', id);
  if (error) throw error;
}

export async function deleteTraining(id: string) {
  const { error } = await supabase.from('trainings').delete().eq('id', id);
  if (error) throw error;
}

export async function setTrainingExercises(trainingId: string, exerciseIds: string[]) {
  await supabase.from('training_exercises').delete().eq('training_id', trainingId);
  if (exerciseIds.length === 0) return;
  const rows = exerciseIds.map((exercise_id, index) => ({
    training_id: trainingId,
    exercise_id,
    position: index,
  }));
  const { error } = await supabase.from('training_exercises').insert(rows);
  if (error) throw error;
}
