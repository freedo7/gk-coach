-- Add result and result_notes columns to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_notes text;
