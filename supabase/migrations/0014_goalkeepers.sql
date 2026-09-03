-- Manual goalkeepers (no account required)
CREATE TABLE goalkeepers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goalkeepers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view goalkeepers"
  ON goalkeepers FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid()));

CREATE POLICY "Admins can manage goalkeepers"
  ON goalkeepers FOR ALL
  USING (team_id IN (
    SELECT tm.team_id FROM team_members tm
    JOIN profiles p ON p.id = tm.profile_id
    WHERE tm.profile_id = auth.uid() AND p.role IN ('admin', 'preparatore')
  ));

-- Link matches and trainings to a specific goalkeeper
ALTER TABLE matches ADD COLUMN goalkeeper_id uuid REFERENCES goalkeepers(id) ON DELETE SET NULL;
ALTER TABLE trainings ADD COLUMN goalkeeper_id uuid REFERENCES goalkeepers(id) ON DELETE SET NULL;
