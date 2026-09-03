import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { MatchRow } from '@/components/match-row';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { deleteMatch, listMatches } from '@/lib/api/matches';
import type { Match } from '@/types/database';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function PartiteScreen() {
  const { isAdmin, currentTeam } = useAuth();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    if (!currentTeam) return;
    listMatches(currentTeam.id, { isAdmin })
      .then(setMatches)
      .catch((err) => setError(err.message));
  }, [currentTeam, isAdmin]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 600);
  }

  async function handleDelete(matchId: string) {
    const prev = matches;
    setMatches((m) => m?.filter((x) => x.id !== matchId) ?? null);
    showToast('Partita eliminata');
    try {
      await deleteMatch(matchId);
    } catch {
      setMatches(prev);
      showToast('Errore durante l\'eliminazione', 'error');
    }
  }

  const today = todayISO();
  const upcoming = (matches ?? []).filter((m) => m.match_date >= today);
  const past = (matches ?? [])
    .filter((m) => m.match_date < today)
    .sort((a, b) => b.match_date.localeCompare(a.match_date));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.pageHeader}>
          <ThemedText type="title">Partite</ThemedText>
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/partite/new')}
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
              <ThemedText style={styles.addBtnText}>+ Nuova</ThemedText>
            </Pressable>
          )}
        </View>

        {error && (
          <ThemedText type="small" themeColor="accent" style={styles.padding}>
            {error}
          </ThemedText>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />}
        >
          {matches === null && !error && (
            <SkeletonList count={3} type="match" />
          )}
          {matches !== null && matches.length === 0 && (
            <EmptyState icon="football-outline" title="Nessuna partita" subtitle="Aggiungi la prima partita con il pulsante + Nuova." />
          )}

          {upcoming.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                PROSSIME PARTITE
              </ThemedText>
              {upcoming.map((match) => (
                <MatchRow key={match.id} match={match} onDelete={isAdmin ? () => handleDelete(match.id) : undefined} />
              ))}
            </View>
          )}

          {past.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                PARTITE PASSATE
              </ThemedText>
              {past.map((match) => (
                <MatchRow key={match.id} match={match} muted onDelete={isAdmin ? () => handleDelete(match.id) : undefined} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  addBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addBtnText: {
    color: Colors.light.accentText,
    fontWeight: '700',
    fontSize: 14,
  },
  padding: {
    padding: Spacing.four,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
