-- ============================================================================
-- TEARDOWN — Rimuove tutti i dati demo creati da seed_screenshots.sql
-- ----------------------------------------------------------------------------
-- Come si usa:
--   Supabase Dashboard -> SQL Editor -> New query -> incolla -> Run
--
-- Elimina SOLO la squadra "GK Coach Demo" e tutto ciò che vi è collegato
-- (portieri, esercizi, allenamenti, partite, mappe tiri, membri).
-- Nessun'altra squadra o dato viene toccato. Se la squadra non esiste,
-- lo script non fa nulla.
-- ============================================================================

DO $$
DECLARE
  v_team uuid;
BEGIN
  SELECT id INTO v_team FROM public.teams WHERE name = 'GK Coach Demo';

  IF v_team IS NULL THEN
    RAISE NOTICE 'Nessuna squadra "GK Coach Demo" trovata: niente da rimuovere.';
    RETURN;
  END IF;

  DELETE FROM public.match_performances
    WHERE match_id IN (SELECT id FROM public.matches WHERE team_id = v_team);

  DELETE FROM public.training_exercises
    WHERE training_id IN (SELECT id FROM public.trainings WHERE team_id = v_team);

  DELETE FROM public.matches      WHERE team_id = v_team;
  DELETE FROM public.trainings    WHERE team_id = v_team;
  DELETE FROM public.exercises    WHERE team_id = v_team;
  DELETE FROM public.goalkeepers  WHERE team_id = v_team;
  DELETE FROM public.team_invites WHERE team_id = v_team;
  DELETE FROM public.team_members WHERE team_id = v_team;
  DELETE FROM public.teams        WHERE id = v_team;

  RAISE NOTICE 'Squadra demo % e tutti i dati collegati sono stati eliminati.', v_team;
END $$;
