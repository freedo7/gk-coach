import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';

export const PRO_ENTITLEMENT = 'pro';

const IOS_KEY = 'test_ROsGGVQBgqVyUVOdbzretiFFzzq';

export interface RCPackage {
  identifier: string;
  packageType: string;
  product: { title: string; priceString: string; description: string };
}

interface PurchasesContextValue {
  isPro: boolean;
  loading: boolean;
  packages: RCPackage[];
  purchasePackage: (pkg: RCPackage) => Promise<{ error: string | null }>;
  restorePurchases: () => Promise<{ error: string | null }>;
}

const PurchasesContext = createContext<PurchasesContextValue>({
  isPro: false,
  loading: false,
  packages: [],
  purchasePackage: async () => ({ error: 'Non disponibile' }),
  restorePurchases: async () => ({ error: 'Non disponibile' }),
});

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [Purchases, setPurchases] = useState<any>(null);
  const [packages, setPackages] = useState<RCPackage[]>([]);

  useEffect(() => {
    if (!session) return;

    // Carica il modulo nativo in modo sicuro (non disponibile in Expo Go)
    let cancelled = false;
    let listenerRef: any = null;
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
        }

        // Carica i package disponibili
        try {
          const offerings = await RC.getOfferings();
          if (!cancelled && offerings.current) {
            setPackages(offerings.current.availablePackages);
          }
        } catch { /* nessun offering configurato */ }

        if (!cancelled) setLoading(false);

        listenerRef = RC.addCustomerInfoUpdateListener((newInfo: any) => {
          setIsPro(newInfo.entitlements.active[PRO_ENTITLEMENT] != null);
        });
      } catch {
        // Expo Go o errore nativo — silenzioso
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; if (typeof listenerRef?.remove === 'function') listenerRef.remove(); };
  }, [session?.user.id]);

  async function purchasePackage(pkg: RCPackage): Promise<{ error: string | null }> {
    if (!Purchases) return { error: 'Acquisti non disponibili in questa versione.' };
    try {
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
    <PurchasesContext.Provider value={{ isPro: isPro || profile?.role === 'admin', loading, packages, purchasePackage, restorePurchases }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  return useContext(PurchasesContext);
}
