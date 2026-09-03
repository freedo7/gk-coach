-- Fix: la policy FOR ALL non funziona per INSERT (serve WITH CHECK separato)
-- Rimuove tutte le policy esistenti e le ricrea correttamente

DROP POLICY IF EXISTS "Team members can view goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "Admins can manage goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "Admins can insert goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "Admins can update goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "Admins can delete goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "select_goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "insert_goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "update_goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "delete_goalkeepers" ON goalkeepers;
DROP POLICY IF EXISTS "gk_select" ON goalkeepers;
DROP POLICY IF EXISTS "gk_insert" ON goalkeepers;
DROP POLICY IF EXISTS "gk_update" ON goalkeepers;
DROP POLICY IF EXISTS "gk_delete" ON goalkeepers;

CREATE POLICY "gk_select" ON goalkeepers FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid()));

CREATE POLICY "gk_insert" ON goalkeepers FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid()));

CREATE POLICY "gk_update" ON goalkeepers FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid()));

CREATE POLICY "gk_delete" ON goalkeepers FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid()));
