-- Add match_type column to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type text CHECK (match_type IN ('amichevole', 'campionato', 'coppa')) DEFAULT 'campionato';
