import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchRow } from '@/components/match-row';
import { QuickAction } from '@/components/quick-action';
import { SkeletonCard, SkeletonMatchRow } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { listMatches } from '@/lib/api/matches';
import { listTrainings } from '@/lib/api/trainings';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match, Training } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const { profile, isAdmin, currentTeam } = useAuth();
  const today = todayISO();

  const [nextTraining, setNextTraining] = useState<Training | null | undefined>(undefined);
  const [nextMatch, setNextMatch] = useState<Match | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    if (!currentTeam) return;
    listTrainings(currentTeam.id).then((data) => {
      const upcoming = data.filter((t) => t.training_date >= today);
      setNextTraining(upcoming[0] ?? null);
    });
    listMatches(currentTeam.id, { isAdmin }).then((data) => {
      const upcoming = data.filter((m) => m.match_date >= today);
      setNextMatch(upcoming[0] ?? null);
    });
  }, [currentTeam, isAdmin, today]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 600);
  }

  const name = profile?.full_name?.trim() || profile?.email || '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />}
        >
          <ThemedText type="title" style={styles.greeting}>
            Ciao{name ? `, ${name.split(' ')[0]}` : ''}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              PROSSIMO ALLENAMENTO
            </ThemedText>
            {nextTraining === undefined ? <SkeletonCard /> : nextTraining === null ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nessun allenamento in programma.
              </ThemedText>
            ) : (
              <ThemedView type="card" style={styles.summaryCard}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {formatDateLong(nextTraining.training_date)}
                </ThemedText>
                <ThemedText type="default" style={{ fontWeight: '700' }}>{nextTraining.title}</ThemedText>
                {formatTime(nextTraining.training_time) && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatTime(nextTraining.training_time)}
                  </ThemedText>
                )}
              </ThemedView>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              PROSSIMA PARTITA
            </ThemedText>
            {nextMatch === undefined ? <SkeletonMatchRow /> : nextMatch === null ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nessuna partita in programma.
              </ThemedText>
            ) : (
              <MatchRow match={nextMatch} />
            )}
          </View>
        </ScrollView>

        <View style={styles.quickActions}>
          <QuickAction href="/esercizi" icon="book-outline" label="Libreria esercizi" />
          <QuickAction href="/allenamenti" icon="calendar-outline" label="Allenamenti" />
          <QuickAction href="/partite" icon="football-outline" label="Partite" />
        </View>
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  greeting: {
    marginTop: Spacing.two,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  summaryCard: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    gap: Spacing.half,
  },
});
