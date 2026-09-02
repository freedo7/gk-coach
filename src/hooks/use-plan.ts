import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePurchases } from '@/context/purchases-context';

const TRIAL_DAYS = 14;

export interface PlanInfo {
  tier: 'trial' | 'base' | 'pro';
  isTrialActive: boolean;
  trialDaysLeft: number;
  isPro: boolean;
  canAddContent: boolean;
  canViewVideo: boolean;
  canViewRichContent: boolean;
  maxTeams: number;
  maxPortieri: number;
}

const PRO: PlanInfo = {
  tier: 'pro',
  isTrialActive: false,
  trialDaysLeft: 0,
  isPro: true,
  canAddContent: true,
  canViewVideo: true,
  canViewRichContent: true,
  maxTeams: Infinity,
  maxPortieri: Infinity,
};

const BASE: PlanInfo = {
  tier: 'base',
  isTrialActive: false,
  trialDaysLeft: 0,
  isPro: false,
  canAddContent: false,
  canViewVideo: false,
  canViewRichContent: false,
  maxTeams: 1,
  maxPortieri: 2,
};

export function usePlan(): PlanInfo {
  const { profile } = useAuth();
  const { isPro: isProRC } = usePurchases();

  return useMemo(() => {
    if (!profile) return PRO; // non ancora caricato, non bloccare

    // RevenueCat ha la precedenza — entitlement attivo = Pro
    if (isProRC) return PRO;

    if (profile.subscription_tier === 'pro') return PRO;

    if (profile.subscription_tier === 'trial') {
      const start = new Date(profile.trial_started_at).getTime();
      const elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24);
      const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));

      if (daysLeft > 0) {
        return {
          ...PRO,
          tier: 'trial',
          isTrialActive: true,
          trialDaysLeft: daysLeft,
          isPro: false,
        };
      }
      // Trial scaduto → base
      return BASE;
    }

    return BASE;
  }, [profile, isProRC]);
}
