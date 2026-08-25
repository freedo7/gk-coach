-- Add sets and reps columns to exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS sets integer;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS reps integer;
