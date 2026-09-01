import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Profile } from '@/types/database';

const ROLE_LABEL = {
  admin: 'Preparatore',
  portiere: 'Portiere',
} as const;

export default function UtentiScreen() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[] | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('*').order('full_name')
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  if (!isAdmin) return <Redirect href="/profilo" />;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {users === null && (
          <ActivityIndicator color={Colors.light.accent} style={styles.loader} />
        )}
        {users !== null && users.length === 0 && (
          <ThemedText themeColor="textSecondary">Nessun utente trovato.</ThemedText>
        )}
        {users?.map((user) => (
          <ThemedView key={user.id} type="card" style={styles.userCard}>
            <View style={styles.userLeft}>
              <ThemedText type="smallBold">{user.full_name || 'Senza nome'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{user.email}</ThemedText>
            </View>
            <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
              <ThemedText
                type="small"
                style={[styles.roleText, user.role === 'admin' && styles.roleTextAdmin]}>
                {ROLE_LABEL[user.role]}
              </ThemedText>
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
    gap: Spacing.two,
  },
  loader: { marginTop: Spacing.five },
  userCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLeft: {
    gap: Spacing.half,
    flexShrink: 1,
  },
  roleBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    backgroundColor: Colors.light.backgroundElement,
  },
  roleBadgeAdmin: {
    backgroundColor: Colors.light.accent,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  roleTextAdmin: {
    color: Colors.light.accentText,
  },
});
