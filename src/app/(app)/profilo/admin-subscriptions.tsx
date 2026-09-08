import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { supabase } from '@/lib/supabase';
import { BottomTabInset, Fonts, Radius, Spacing } from '@/constants/theme';

interface ProfileSub {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_tier: string;
  trial_started_at: string;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  pro: { color: '#FFD60A', label: '★ Pro' },
  trial: { color: '#FF9500', label: 'Trial' },
  base: { color: '#8E8E93', label: 'Base' },
};

export default function AdminSubscriptionsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [profiles, setProfiles] = useState<ProfileSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, subscription_tier, trial_started_at, created_at')
      .order('subscription_tier', { ascending: true });
    setProfiles((data as ProfileSub[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const proCount = profiles.filter((p) => p.subscription_tier === 'pro').length;
  const trialCount = profiles.filter((p) => p.subscription_tier === 'trial').length;
  const baseCount = profiles.filter((p) => p.subscription_tier === 'base').length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        {!loading && profiles.length === 0 && (
          <ThemedView type="card" style={[styles.card, styles.emptyCard]}>
            <Ionicons name="card-outline" size={40} color={colors.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary">{t('settings.adminNoSubscriptions')}</ThemedText>
          </ThemedView>
        )}

        {/* Riepilogo */}
        {profiles.length > 0 && (
          <ThemedView type="card" style={[styles.card, styles.summaryCard]}>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryNum, { color: '#FFD60A' }]}>{proCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Pro</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryNum, { color: '#FF9500' }]}>{trialCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Trial</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryNum, { color: '#8E8E93' }]}>{baseCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Base</ThemedText>
            </View>
          </ThemedView>
        )}

        {profiles.map((p) => {
          const tier = TIER_CONFIG[p.subscription_tier] ?? TIER_CONFIG.base;
          return (
            <ThemedView key={p.id} type="card" style={styles.card}>
              <View style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{p.full_name ?? '—'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{p.email}</ThemedText>
                </View>
                <View style={styles.rightCol}>
                  <View style={[styles.tierBadge, { backgroundColor: tier.color + '20' }]}>
                    <ThemedText type="small" style={{ color: tier.color, fontWeight: '700' }}>{tier.label}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">{formatDate(p.created_at)}</ThemedText>
                </View>
              </View>
            </ThemedView>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.four * 2,
    gap: Spacing.two,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.four,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryNum: {
    fontSize: 28,
    fontFamily: Fonts.sansBold,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tierBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
