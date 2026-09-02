export type UserRole = 'admin' | 'portiere';
export type SubscriptionTier = 'trial' | 'base' | 'pro';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  trial_started_at: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  coach_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  joined_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  code: string;
  expires_at: string;
  used_by: string | null;
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
  team_id: string | null;
  is_global: boolean;
  video_url: string | null;
  content_url: string | null;
  difficulty: 'base' | 'intermedio' | 'avanzato' | null;
  duration_minutes: number | null;
  equipment: string | null;
  sets: number | null;
  reps: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  team_id: string | null;
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
  team_id: string | null;
  opponent: string;
  is_home: boolean;
  match_date: string;
  match_time: string | null;
  match_type: 'amichevole' | 'campionato' | 'coppa';
  result: string | null;
  result_notes: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
