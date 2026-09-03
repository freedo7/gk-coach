-- Fase 10: Push tokens per notifiche Expo

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- L'utente può inserire/leggere/eliminare solo i propri token
CREATE POLICY "push_tokens_select_own" ON public.push_tokens FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "push_tokens_insert_own" ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "push_tokens_delete_own" ON public.push_tokens FOR DELETE
  USING (auth.uid() = profile_id);
