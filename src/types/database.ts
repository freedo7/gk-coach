export type UserRole = 'admin' | 'portiere';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  sort_order: number;
  icon: string | null;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  category_id: string;
  video_url: string | null;
  difficulty: 'base' | 'intermedio' | 'avanzato' | null;
  duration_minutes: number | null;
  equipment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  training_date: string;
  training_time: string | null;
  title: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingExercise {
  id: string;
  training_id: string;
  exercise_id: string;
  position: number;
  note: string | null;
}

export interface Match {
  id: string;
  opponent: string;
  is_home: boolean;
  match_date: string;
  match_time: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
