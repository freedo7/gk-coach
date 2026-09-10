-- Fase 19: cancellazione self-service dell'account.
-- Richiesto dalle linee guida di App Store e Google Play: l'utente deve poter
-- eliminare account e dati direttamente dall'app, senza contattare il supporto.
--
-- Esegui nel SQL Editor di Supabase (Dashboard -> SQL Editor -> New query).

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  -- 1. Squadre di cui l'utente è allenatore: eliminate con tutti i contenuti.
  SELECT array_agg(id) INTO v_team_ids FROM public.teams WHERE coach_id = v_uid;

  IF v_team_ids IS NOT NULL THEN
    DELETE FROM public.match_performances
      WHERE match_id IN (SELECT id FROM public.matches WHERE team_id = ANY(v_team_ids));
    DELETE FROM public.training_comments
      WHERE training_id IN (SELECT id FROM public.trainings WHERE team_id = ANY(v_team_ids));
    DELETE FROM public.training_exercises
      WHERE training_id IN (SELECT id FROM public.trainings WHERE team_id = ANY(v_team_ids));
    DELETE FROM public.matches      WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.trainings    WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.exercises    WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.goalkeepers  WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.team_invites WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.team_members WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.teams        WHERE id = ANY(v_team_ids);
  END IF;

  -- 2. Contenuti creati dall'utente in squadre altrui: si scollegano, non si eliminano.
  UPDATE public.trainings    SET created_by = NULL WHERE created_by = v_uid;
  UPDATE public.matches      SET created_by = NULL WHERE created_by = v_uid;
  UPDATE public.exercises    SET created_by = NULL WHERE created_by = v_uid;
  UPDATE public.goalkeepers  SET created_by = NULL WHERE created_by = v_uid;
  UPDATE public.team_invites SET used_by = NULL WHERE used_by = v_uid;

  -- 3. Dati personali diretti dell'utente.
  DELETE FROM public.training_comments WHERE profile_id = v_uid;
  DELETE FROM public.feedback          WHERE user_id = v_uid;
  DELETE FROM public.push_tokens       WHERE profile_id = v_uid;
  DELETE FROM public.team_members      WHERE profile_id = v_uid;

  -- 4. Profilo e utenza di autenticazione.
  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

-- Eseguibile solo da utenti autenticati (agisce sempre e solo su auth.uid()).
REVOKE ALL ON FUNCTION public.delete_my_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
