import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';

export const PRO_ENTITLEMENT = 'pro';

const IOS_KEY = 'test_ROsGGVQBgqVyUVOdbzretiFFzzq';

interface PurchasesContextValue {
  isPro: boolean;
  loading: boolean;
  purchasePro: () => Promise<{ error: string | null }>;
  restorePurchases: () => Promise<{ error: string | null }>;
}

const PurchasesContext = createContext<PurchasesContextValue>({
  isPro: false,
  loading: false,
  purchasePro: async () => ({ error: 'Non disponibile' }),
  restorePurchases: async () => ({ error: 'Non disponibile' }),
});

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [Purchases, setPurchases] = useState<any>(null);

  useEffect(() => {
    if (!session) return;

    // Carica il modulo nativo in modo sicuro (non disponibile in Expo Go)
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('react-native-purchases');
        if (cancelled) return;

        const RC = mod.default;
        const { LOG_LEVEL } = mod;

        RC.setLogLevel(LOG_LEVEL.ERROR);
        RC.configure({
          apiKey: Platform.OS === 'ios' ? IOS_KEY : IOS_KEY,
          appUserID: session.user.id,
        });

        setPurchases(RC);
        setLoading(true);

        const info = await RC.getCustomerInfo();
        if (!cancelled) {
          setIsPro(info.entitlements.active[PRO_ENTITLEMENT] != null);
          setLoading(false);
        }

        const listener = RC.addCustomerInfoUpdateListener((newInfo: any) => {
          setIsPro(newInfo.entitlements.active[PRO_ENTITLEMENT] != null);
        });

        return () => { listener.remove(); };
      } catch {
        // Expo Go o errore nativo — silenzioso
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user.id]);

  async function purchasePro(): Promise<{ error: string | null }> {
    if (!Purchases) return { error: 'Acquisti non disponibili in questa versione.' };
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) return { error: 'Nessun prodotto disponibile al momento.' };
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setIsPro(customerInfo.entitlements.active[PRO_ENTITLEMENT] != null);
      return { error: null };
    } catch (e: any) {
      if (e?.userCancelled) return { error: null };
      return { error: e?.message ?? 'Errore durante l\'acquisto.' };
    }
  }

  async function restorePurchases(): Promise<{ error: string | null }> {
    if (!Purchases) return { error: 'Acquisti non disponibili in questa versione.' };
    try {
      const info = await Purchases.restorePurchases();
      setIsPro(info.entitlements.active[PRO_ENTITLEMENT] != null);
      return { error: null };
    } catch (e: any) {
      return { error: e?.message ?? 'Errore durante il ripristino.' };
    }
  }

  return (
    <PurchasesContext.Provider value={{ isPro, loading, purchasePro, restorePurchases }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  return useContext(PurchasesContext);
}
