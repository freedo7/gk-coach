-- Add structured match stats fields
ALTER TABLE matches
  ADD COLUMN goals_scored smallint,
  ADD COLUMN goals_conceded smallint,
  ADD COLUMN rating smallint CHECK (rating >= 1 AND rating <= 10);
