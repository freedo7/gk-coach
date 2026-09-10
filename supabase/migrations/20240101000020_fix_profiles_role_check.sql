-- Fase 20: allinea il vincolo CHECK di profiles.role al ruolo 'preparatore'.
--
-- La Fase 11 ha aggiornato handle_new_user() per accettare 'preparatore' ma NON
-- il vincolo CHECK della colonna, ancora fermo a ('admin','portiere') della
-- Fase 1. Registrandosi come "Preparatore" il trigger tenta di inserire
-- role='preparatore', il CHECK lo rifiuta e Supabase restituisce
-- "Database error saving new user".
--
-- Esegui nel SQL Editor di Supabase (Dashboard -> SQL Editor -> New query).

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'preparatore', 'portiere'));
