-- Fase 8: Multi-tenant — squadre, membri, codici invito.
-- Esegui nel SQL Editor di Supabase (Dashboard → SQL Editor → New query).

-- ─── 1. NUOVE TABELLE ───────────────────────────────────────────────────────

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, profile_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- ─── 2. COLONNE NUOVE ───────────────────────────────────────────────────────

ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);
ALTER TABLE public.matches   ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- ─── 3. FUNZIONI HELPER ─────────────────────────────────────────────────────

-- Tutti i team_id dell'utente corrente (come coach o membro)
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id       FROM public.teams        WHERE coach_id  = auth.uid()
  UNION
  SELECT team_id  FROM public.team_members WHERE profile_id = auth.uid()
$$;

-- L'utente corrente è coach di questo team?
CREATE OR REPLACE FUNCTION public.is_team_coach(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id AND coach_id = auth.uid())
$$;

-- Entra in una squadra tramite codice invito
CREATE OR REPLACE FUNCTION public.join_team_by_code(p_code text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_invite public.team_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE code = upper(p_code) AND used_by IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RETURN 'Codice non valido o scaduto.';
  END IF;

  INSERT INTO public.team_members (team_id, profile_id)
  VALUES (v_invite.team_id, auth.uid())
  ON CONFLICT DO NOTHING;

  UPDATE public.team_invites SET used_by = auth.uid() WHERE id = v_invite.id;
  RETURN 'ok';
END;
$$;

-- Genera un codice invito per un team (solo il coach)
CREATE OR REPLACE FUNCTION public.create_invite_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_code text;
BEGIN
  IF NOT is_team_coach(p_team_id) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;
  v_code := 'GK-' || upper(substring(encode(gen_random_bytes(3), 'hex'), 1, 6));
  INSERT INTO public.team_invites (team_id, code) VALUES (p_team_id, v_code);
  RETURN v_code;
END;
$$;

-- Aggiorna handle_new_user per leggere il ruolo dai metadati di registrazione
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'portiere');
  IF v_role NOT IN ('admin', 'portiere') THEN v_role := 'portiere'; END IF;
  INSERT INTO public.profiles (id, email, role) VALUES (new.id, new.email, v_role);
  RETURN new;
END;
$$;

-- ─── 4. RLS POLICIES ────────────────────────────────────────────────────────

-- Teams
CREATE POLICY "teams_select" ON public.teams FOR SELECT
  USING (coach_id = auth.uid() OR id IN (SELECT team_id FROM public.team_members WHERE profile_id = auth.uid()));
CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "teams_update" ON public.teams FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "teams_delete" ON public.teams FOR DELETE USING (coach_id = auth.uid());

-- Team members
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT
  USING (profile_id = auth.uid() OR team_id IN (SELECT id FROM public.teams WHERE coach_id = auth.uid()));
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT
  WITH CHECK (is_team_coach(team_id) OR auth.uid() = profile_id);
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE USING (is_team_coach(team_id));

-- Team invites
CREATE POLICY "team_invites_select" ON public.team_invites FOR SELECT USING (is_team_coach(team_id));
CREATE POLICY "team_invites_insert" ON public.team_invites FOR INSERT WITH CHECK (is_team_coach(team_id));

-- Profiles: il coach vede i profili dei suoi membri
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own_or_team" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT tm.profile_id FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id WHERE t.coach_id = auth.uid()
    )
  );

-- Trainings: scoped al team (compatibilità dati esistenti: team_id IS NULL visibili al creator)
DROP POLICY IF EXISTS "trainings_select_authenticated" ON public.trainings;
DROP POLICY IF EXISTS "trainings_admin_insert"          ON public.trainings;
DROP POLICY IF EXISTS "trainings_admin_update"          ON public.trainings;
DROP POLICY IF EXISTS "trainings_admin_delete"          ON public.trainings;

CREATE POLICY "trainings_select" ON public.trainings FOR SELECT
  USING (team_id IN (SELECT get_my_team_ids()) OR (team_id IS NULL AND created_by = auth.uid()));
CREATE POLICY "trainings_insert" ON public.trainings FOR INSERT WITH CHECK (is_team_coach(team_id));
CREATE POLICY "trainings_update" ON public.trainings FOR UPDATE USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
CREATE POLICY "trainings_delete" ON public.trainings FOR DELETE USING (is_team_coach(team_id));

-- Matches: scoped al team
DROP POLICY IF EXISTS "matches_select_authenticated" ON public.matches;
DROP POLICY IF EXISTS "matches_admin_insert"         ON public.matches;
DROP POLICY IF EXISTS "matches_admin_update"         ON public.matches;
DROP POLICY IF EXISTS "matches_admin_delete"         ON public.matches;

CREATE POLICY "matches_select" ON public.matches FOR SELECT
  USING (team_id IN (SELECT get_my_team_ids()) OR (team_id IS NULL AND created_by = auth.uid()));
CREATE POLICY "matches_insert" ON public.matches FOR INSERT WITH CHECK (is_team_coach(team_id));
CREATE POLICY "matches_update" ON public.matches FOR UPDATE USING (is_team_coach(team_id)) WITH CHECK (is_team_coach(team_id));
CREATE POLICY "matches_delete" ON public.matches FOR DELETE USING (is_team_coach(team_id));

-- Exercises: globali o del proprio team
-- team_id IS NULL = vecchi esercizi, visibili a tutti (retrocompatibilità)
DROP POLICY IF EXISTS "exercises_select_authenticated" ON public.exercises;
DROP POLICY IF EXISTS "exercises_admin_insert"         ON public.exercises;
DROP POLICY IF EXISTS "exercises_admin_update"         ON public.exercises;
DROP POLICY IF EXISTS "exercises_admin_delete"         ON public.exercises;

CREATE POLICY "exercises_select" ON public.exercises FOR SELECT
  USING (is_global = true OR team_id IS NULL OR team_id IN (SELECT get_my_team_ids()));
CREATE POLICY "exercises_insert" ON public.exercises FOR INSERT
  WITH CHECK (team_id IS NOT NULL AND is_team_coach(team_id));
CREATE POLICY "exercises_update" ON public.exercises FOR UPDATE
  USING (is_team_coach(team_id) OR team_id IS NULL)
  WITH CHECK (is_team_coach(team_id) OR team_id IS NULL);
CREATE POLICY "exercises_delete" ON public.exercises FOR DELETE
  USING (is_team_coach(team_id) OR team_id IS NULL);

-- ─── NOTA POST-MIGRAZIONE ────────────────────────────────────────────────────
-- Dopo aver creato la tua squadra nell'app, migra i dati esistenti con:
--
--   UPDATE trainings SET team_id = '<il-tuo-team-id>' WHERE team_id IS NULL;
--   UPDATE matches   SET team_id = '<il-tuo-team-id>' WHERE team_id IS NULL;
--   UPDATE exercises SET team_id = '<il-tuo-team-id>' WHERE team_id IS NULL AND NOT is_global;
--
-- Oppure marca gli esercizi esistenti come globali:
--   UPDATE exercises SET is_global = true WHERE team_id IS NULL;
