-- Fase 18: Aggiungere campi telefono al profilo
-- Esegui nel SQL Editor di Supabase (Dashboard → SQL Editor → New query).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
