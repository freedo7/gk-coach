-- Fase 21: fix create_invite_code.
--
-- La versione della Fase 8 usa gen_random_bytes() (estensione pgcrypto): con
-- SET search_path = public quella funzione non viene risolta su Supabase
-- (pgcrypto vive nello schema `extensions`), quindi la generazione del codice
-- invito fallisce con un errore generico.
--
-- Qui usiamo gen_random_uuid(), funzione core sempre disponibile.
--
-- Esegui nel SQL Editor di Supabase (Dashboard -> SQL Editor -> New query).

CREATE OR REPLACE FUNCTION public.create_invite_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_code text;
BEGIN
  IF NOT is_team_coach(p_team_id) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  -- Codice tipo GK-A1B2C3 dai primi 6 caratteri esadecimali di un uuid casuale.
  v_code := 'GK-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.team_invites (team_id, code) VALUES (p_team_id, v_code);
  RETURN v_code;
END;
$$;
