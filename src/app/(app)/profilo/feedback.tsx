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
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

interface FeedbackItem {
  id: string;
  user_email: string | null;
  message: string;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FeedbackListScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('feedback')
      .select('id, user_email, message, created_at')
      .order('created_at', { ascending: false });
    setItems((data as FeedbackItem[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        {!loading && items.length === 0 && (
          <ThemedView type="card" style={[styles.card, styles.emptyCard]}>
            <Ionicons name="chatbubble-outline" size={40} color={colors.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {t('settings.feedbackNoItems')}
            </ThemedText>
          </ThemedView>
        )}

        {items.map((item) => (
          <ThemedView key={item.id} type="card" style={styles.card}>
            <View style={styles.feedbackHeader}>
              <View style={styles.emailRow}>
                <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
                <ThemedText type="smallBold">{item.user_email ?? '—'}</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">{formatDate(item.created_at)}</ThemedText>
            </View>
            <ThemedText type="default" style={styles.messageText}>{item.message}</ThemedText>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    gap: Spacing.two,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.four * 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  messageText: {
    lineHeight: 22,
  },
});
