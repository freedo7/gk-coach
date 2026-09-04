import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { usePlan } from '@/hooks/use-plan';
import { usePurchases, type RCPackage } from '@/context/purchases-context';
import { Radius, Spacing } from '@/constants/theme';

const FEATURES = [
  { icon: 'people-outline', baseKey: 'paywall.features.baseTeam', proKey: 'paywall.features.proTeam' },
  { icon: 'add-circle-outline', baseKey: 'paywall.features.baseView', proKey: 'paywall.features.proCreate' },
  { icon: 'play-circle-outline', baseKey: 'paywall.features.baseVideo', proKey: 'paywall.features.proVideo' },
  { icon: 'document-text-outline', baseKey: 'paywall.features.baseContent', proKey: 'paywall.features.proContent' },
];

const PKG_ORDER: Record<string, number> = {
  $rc_monthly: 0,
  $rc_annual: 1,
  $rc_lifetime: 2,
};

const PKG_LABEL_KEY: Record<string, string> = {
  $rc_monthly: 'paywall.monthly',
  $rc_annual: 'paywall.yearly',
  $rc_lifetime: 'paywall.lifetime',
};

const PKG_BADGE_KEY: Record<string, string | undefined> = {
  $rc_annual: 'paywall.saveBadge',
};

export default function PaywallScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
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

  function FeatureRow({ icon, baseKey, proKey }: { icon: string; baseKey: string; proKey: string }) {
    return (
      <View style={styles.featureRow}>
        <Ionicons name={icon as any} size={20} color={colors.accent} style={styles.featureIcon} />
        <View style={styles.featureCols}>
          <View style={styles.featureCol}>
            <ThemedText type="small" themeColor="textSecondary">{t(baseKey)}</ThemedText>
          </View>
          <View style={styles.featureCol}>
            <ThemedText type="smallBold" style={{ color: colors.accent }}>{t(proKey)}</ThemedText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>

        {plan.isTrialActive && (
          <ThemedView type="backgroundElement" style={styles.trialBadge}>
            <ThemedText type="smallBold" style={{ color: colors.accent }}>
              {t('paywall.trialActive', { days: plan.trialDaysLeft })}
            </ThemedText>
          </ThemedView>
        )}

        {!plan.isTrialActive && plan.tier !== 'pro' && (
          <ThemedView style={[styles.expiredBadge, { backgroundColor: colors.dangerSoft }]}>
            <ThemedText type="smallBold" style={{ color: colors.danger }}>
              {t('paywall.trialExpired')}
            </ThemedText>
          </ThemedView>
        )}

        <ThemedText type="title" style={styles.title}>{t('paywall.proTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {t('paywall.proSubtitle')}
        </ThemedText>

        <ThemedView type="card" style={styles.card}>
          <View style={styles.planHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.planLabel}>{t('paywall.basePlan')}</ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary" style={[styles.planLabel, { color: colors.accent }]}>{t('paywall.proPlan')}</ThemedText>
          </View>

          {FEATURES.map((f) => (
            <FeatureRow key={f.icon} {...f} />
          ))}
        </ThemedView>

        {plan.isPro ? (
          <ThemedView type="card" style={styles.priceCard}>
            <ThemedView style={[styles.activeProBadge, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('paywall.proActive')}</ThemedText>
            </ThemedView>
          </ThemedView>
        ) : (
          <>
            {/* Selezione piano */}
            {sortedPkgs.length > 0 && (
              <View style={styles.pkgRow}>
                {sortedPkgs.map((pkg) => {
                  const selected = pkg.identifier === activePkg?.identifier;
                  const badge = PKG_BADGE_KEY[pkg.identifier];
                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => setSelectedPkg(pkg)}
                      style={[
                        styles.pkgCard,
                        { backgroundColor: colors.card, borderColor: 'transparent' },
                        selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft },
                      ]}>
                      {badge && (
                        <View style={[styles.pkgBadge, { backgroundColor: colors.accent }]}>
                          <ThemedText type="small" style={[styles.pkgBadgeText, { color: colors.accentText }]}>{t(badge!)}</ThemedText>
                        </View>
                      )}
                      <ThemedText type="smallBold" style={selected ? { color: colors.accent } : undefined}>
                        {PKG_LABEL_KEY[pkg.identifier] ? t(PKG_LABEL_KEY[pkg.identifier]) : pkg.product.title}
                      </ThemedText>
                      <ThemedText type="subtitle" style={[styles.pkgPrice, selected && { color: colors.accent }]}>
                        {pkg.product.priceString}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {pkg.identifier === '$rc_monthly' ? t('paywall.perMonth')
                          : pkg.identifier === '$rc_annual' ? t('paywall.perYear')
                          : t('paywall.oneTime')}
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
                  {t('paywall.comingSoon')}
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
                style={({ pressed }) => [styles.buyBtn, { backgroundColor: colors.accent }, buying && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}>
                {buying
                  ? <ActivityIndicator color={colors.accentText} />
                  : <ThemedText type="smallBold" style={[styles.buyBtnText, { color: colors.accentText }]}>
                      {t('paywall.upgradeButton', { price: activePkg.product.priceString })}
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
                ? <ActivityIndicator color={colors.accent} />
                : <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('paywall.restorePurchases')}</ThemedText>}
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
  expiredBadge: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
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
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
    borderWidth: 2,
  },
  pkgPrice: {
    fontWeight: '700',
  },
  pkgBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  pkgBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  buyBtn: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    width: '100%',
  },
  buyBtnText: {
    fontSize: 16,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
