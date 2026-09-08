-- Fase 17: RPC per creare una squadra (bypassa RLS + auto-aggiunge come membro)
-- Esegui nel SQL Editor di Supabase (Dashboard → SQL Editor → New query).

CREATE OR REPLACE FUNCTION public.create_team_with_member(p_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  INSERT INTO public.teams (name, coach_id)
  VALUES (trim(p_name), auth.uid())
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, profile_id)
  VALUES (v_team_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_team_id;
END;
$$;
