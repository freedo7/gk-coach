import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlan } from '@/hooks/use-plan';
import { Colors, Radius, Spacing } from '@/constants/theme';

const FEATURES = [
  { icon: 'people-outline', base: '1 squadra, 2 portieri', pro: 'Squadre e portieri illimitati' },
  { icon: 'add-circle-outline', base: 'Solo visualizzazione', pro: 'Crea allenamenti, partite, esercizi' },
  { icon: 'play-circle-outline', base: 'Nessun video', pro: 'Video e schede PDF inclusi' },
  { icon: 'document-text-outline', base: 'Descrizioni base', pro: 'Contenuti ricchi e dettagliati' },
];

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

        <ThemedView type="card" style={styles.priceCard}>
          <ThemedText type="subtitle" style={styles.priceTitle}>Piano Pro</ThemedText>
          <ThemedText themeColor="textSecondary">Abbonamento mensile o annuale</ThemedText>
          <ThemedView style={styles.comingSoon}>
            <Ionicons name="time-outline" size={20} color={Colors.light.accent} />
            <ThemedText type="smallBold" style={styles.comingSoonText}>
              Acquisto in-app disponibile a breve
            </ThemedText>
          </ThemedView>
        </ThemedView>

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
  priceTitle: {
    fontWeight: '700',
  },
  comingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    backgroundColor: Colors.light.accentSoft,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  comingSoonText: {
    color: Colors.light.accent,
  },
});
