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

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#FF9500',
  preparatore: '#5AC8FA',
  portiere: '#34C759',
};

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) ?? []);
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

        {!loading && users.length === 0 && (
          <ThemedView type="card" style={[styles.card, styles.emptyCard]}>
            <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary">{t('settings.adminNoUsers')}</ThemedText>
          </ThemedView>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
          {users.length} {t('settings.adminUsers').toLowerCase()}
        </ThemedText>

        {users.map((user) => (
          <ThemedView key={user.id} type="card" style={styles.card}>
            <View style={styles.userRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{user.full_name ?? '—'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{user.email}</ThemedText>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[user.role] ?? colors.textSecondary) + '20' }]}>
                  <ThemedText type="small" style={{ color: ROLE_COLORS[user.role] ?? colors.textSecondary, fontWeight: '600' }}>
                    {user.role}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">{formatDate(user.created_at)}</ThemedText>
              </View>
            </View>
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
  count: {
    marginBottom: Spacing.one,
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
  roleBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
