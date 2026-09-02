import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlan } from '@/hooks/use-plan';
import { usePurchases, type RCPackage } from '@/context/purchases-context';
import { Colors, Radius, Spacing } from '@/constants/theme';

const FEATURES = [
  { icon: 'people-outline', base: '1 squadra, 2 portieri', pro: 'Squadre e portieri illimitati' },
  { icon: 'add-circle-outline', base: 'Solo visualizzazione', pro: 'Crea allenamenti, partite, esercizi' },
  { icon: 'play-circle-outline', base: 'Nessun video', pro: 'Video e schede PDF inclusi' },
  { icon: 'document-text-outline', base: 'Descrizioni base', pro: 'Contenuti ricchi e dettagliati' },
];

const PKG_ORDER: Record<string, number> = {
  $rc_monthly: 0,
  $rc_annual: 1,
  $rc_lifetime: 2,
};

const PKG_LABEL: Record<string, string> = {
  $rc_monthly: 'Mensile',
  $rc_annual: 'Annuale',
  $rc_lifetime: 'A vita',
};

const PKG_BADGE: Record<string, string | undefined> = {
  $rc_annual: 'Risparmia',
};

function FeatureRow({ icon, base, pro }: { icon: string; base: string; pro: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as any} size={20} color={Colors.light.accent} style={styles.featureIcon} />
      <View style={styles.featureCols}>
        <View style={styles.featureCol}>
          <ThemedText type="small" themeColor="textSecondary">{base}</ThemedText>
        </View>
        <View style={styles.featureCol}>
          <ThemedText type="smallBold" style={styles.proText}>{pro}</ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function PaywallScreen() {
  const plan = usePlan();
  const { purchasePackage, restorePurchases, packages } = usePurchases();
  const [selectedPkg, setSelectedPkg] = useState<RCPackage | null>(null);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ordina i package: mensile, annuale, lifetime
  const sortedPkgs = [...packages].sort(
    (a, b) => (PKG_ORDER[a.identifier] ?? 9) - (PKG_ORDER[b.identifier] ?? 9),
  );

  // Seleziona automaticamente l'annuale se disponibile, altrimenti il primo
  const activePkg = selectedPkg ?? sortedPkgs.find((p) => p.identifier === '$rc_annual') ?? sortedPkgs[0] ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>

        {plan.isTrialActive && (
          <ThemedView type="backgroundElement" style={styles.trialBadge}>
            <ThemedText type="smallBold" style={styles.trialText}>
              Trial attivo — {plan.trialDaysLeft} giorni rimanenti
            </ThemedText>
          </ThemedView>
        )}

        {!plan.isTrialActive && plan.tier !== 'pro' && (
          <ThemedView style={styles.expiredBadge}>
            <ThemedText type="smallBold" style={styles.expiredText}>
              Trial scaduto — sei nel piano Base
            </ThemedText>
          </ThemedView>
        )}

        <ThemedText type="title" style={styles.title}>GK Coach Pro</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Sblocca tutte le funzionalità per il tuo lavoro da preparatore
        </ThemedText>

        <ThemedView type="card" style={styles.card}>
          <View style={styles.planHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.planLabel}>BASE</ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary" style={[styles.planLabel, styles.planLabelPro]}>PRO</ThemedText>
          </View>

          {FEATURES.map((f) => (
            <FeatureRow key={f.icon} {...f} />
          ))}
        </ThemedView>

        {plan.isPro ? (
          <ThemedView type="card" style={styles.priceCard}>
            <ThemedView style={styles.activeProBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.light.accent} />
              <ThemedText type="smallBold" style={styles.accentText}>Piano Pro attivo</ThemedText>
            </ThemedView>
          </ThemedView>
        ) : (
          <>
            {/* Selezione piano */}
            {sortedPkgs.length > 0 && (
              <View style={styles.pkgRow}>
                {sortedPkgs.map((pkg) => {
                  const selected = pkg.identifier === activePkg?.identifier;
                  const badge = PKG_BADGE[pkg.identifier];
                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => setSelectedPkg(pkg)}
                      style={[styles.pkgCard, selected && styles.pkgCardSelected]}>
                      {badge && (
                        <View style={styles.pkgBadge}>
                          <ThemedText type="small" style={styles.pkgBadgeText}>{badge}</ThemedText>
                        </View>
                      )}
                      <ThemedText type="smallBold" style={selected ? styles.accentText : undefined}>
                        {PKG_LABEL[pkg.identifier] ?? pkg.product.title}
                      </ThemedText>
                      <ThemedText type="subtitle" style={[styles.pkgPrice, selected && styles.accentText]}>
                        {pkg.product.priceString}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {pkg.identifier === '$rc_monthly' ? '/mese'
                          : pkg.identifier === '$rc_annual' ? '/anno'
                          : 'una tantum'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Nessun prodotto disponibile */}
            {sortedPkgs.length === 0 && (
              <ThemedView type="card" style={styles.priceCard}>
                <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                  Abbonamento disponibile a breve.
                </ThemedText>
              </ThemedView>
            )}

            {error && (
              <ThemedText type="small" themeColor="accent" style={{ textAlign: 'center' }}>{error}</ThemedText>
            )}

            {/* Bottone acquista */}
            {activePkg && (
              <Pressable
                onPress={async () => {
                  setError(null);
                  setBuying(true);
                  const { error: err } = await purchasePackage(activePkg);
                  setBuying(false);
                  if (err) setError(err);
                }}
                disabled={buying}
                style={({ pressed }) => [styles.buyBtn, buying && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}>
                {buying
                  ? <ActivityIndicator color={Colors.light.accentText} />
                  : <ThemedText type="smallBold" style={styles.buyBtnText}>
                      Passa a Pro — {activePkg.product.priceString}
                    </ThemedText>}
              </Pressable>
            )}

            <Pressable
              onPress={async () => {
                setError(null);
                setRestoring(true);
                const { error: err } = await restorePurchases();
                setRestoring(false);
                if (err) setError(err);
              }}
              disabled={restoring}
              style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.7 }]}>
              {restoring
                ? <ActivityIndicator color={Colors.light.accent} />
                : <ThemedText type="small" style={styles.restoreBtnText}>Ripristina acquisti</ThemedText>}
            </Pressable>
          </>
        )}

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  trialBadge: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  trialText: {
    color: Colors.light.accent,
  },
  expiredBadge: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    backgroundColor: Colors.light.dangerSoft,
  },
  expiredText: {
    color: Colors.light.danger,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 0,
  },
  planLabel: {
    width: '40%',
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 1,
  },
  planLabelPro: {
    color: Colors.light.accent,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  featureIcon: {
    width: 24,
  },
  featureCols: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  featureCol: {
    flex: 1,
  },
  proText: {
    color: Colors.light.accent,
  },
  priceCard: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  activeProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.accentSoft,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  accentText: {
    color: Colors.light.accent,
  },
  pkgRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pkgCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    backgroundColor: Colors.light.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pkgCardSelected: {
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accentSoft,
  },
  pkgPrice: {
    fontWeight: '700',
  },
  pkgBadge: {
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  pkgBadgeText: {
    color: Colors.light.accentText,
    fontSize: 10,
    fontWeight: '700',
  },
  buyBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    width: '100%',
  },
  buyBtnText: {
    color: Colors.light.accentText,
    fontSize: 16,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  restoreBtnText: {
    color: Colors.light.textSecondary,
  },
});
