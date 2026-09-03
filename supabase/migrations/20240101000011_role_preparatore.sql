-- Fase 11: Aggiunge il ruolo 'preparatore' per i preparatori dei portieri.
-- Admin = superadmin (sempre Pro), Preparatore = trial 14gg, Portiere = trial 30gg.
-- Esegui nel SQL Editor di Supabase (Dashboard → SQL Editor → New query).

-- ─── 1. AGGIORNA handle_new_user PER ACCETTARE 'preparatore' ───────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'portiere');
  IF v_role NOT IN ('admin', 'preparatore', 'portiere') THEN v_role := 'portiere'; END IF;
  INSERT INTO public.profiles (id, email, role) VALUES (new.id, new.email, v_role);
  RETURN new;
END;
$$;

-- ─── 2. AGGIORNA is_team_coach PER INCLUDERE PREPARATORI ───────────────────
-- I preparatori possono gestire i team come i coach

CREATE OR REPLACE FUNCTION public.is_team_coach(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id AND coach_id = auth.uid())
$$;

-- ─── 3. AGGIORNA get_my_team_ids PER INCLUDERE PREPARATORI ─────────────────

CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id       FROM public.teams        WHERE coach_id  = auth.uid()
  UNION
  SELECT team_id  FROM public.team_members WHERE profile_id = auth.uid()
$$;

-- ─── NOTA ────────────────────────────────────────────────────────────────────
-- Il ruolo 'preparatore' ha gli stessi permessi del vecchio 'admin' per
-- quanto riguarda la gestione di allenamenti, partite, esercizi e team.
-- L'unica differenza è nel piano: il preparatore ha un trial di 14 giorni
-- mentre il portiere ha un trial di 30 giorni.
-- Il ruolo 'admin' è riservato al superadmin e ha sempre accesso Pro.
