-- Fase 9: Subscription tiers — trial, base, pro.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'trial'
    CHECK (subscription_tier IN ('trial', 'base', 'pro'));

-- Gli utenti esistenti partono dal trial con data = created_at
UPDATE public.profiles
SET trial_started_at = created_at
WHERE trial_started_at > now() - interval '1 second'; -- solo quelli appena aggiunti col default

-- Policy: l'utente può leggere il proprio tier
-- (già coperta da profiles_select_own_or_team)

-- Solo service_role può aggiornare subscription_tier (verrà chiamato da webhook RevenueCat)
CREATE POLICY "profiles_update_own_name" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
