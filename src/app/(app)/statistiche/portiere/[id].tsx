import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MatchRow } from '@/components/match-row';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { listMatches } from '@/lib/api/matches';
import { listTrainings } from '@/lib/api/trainings';
import { listGoalkeepers } from '@/lib/api/goalkeepers';
import { useToast } from '@/context/toast-context';
import { generateGoalkeeperPdf } from '@/lib/pdf';
import type { Match, Training, Goalkeeper } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

export default function SchedaPortiereScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin, currentTeam } = useAuth();
  const colors = useTheme();
  const { show: showToast } = useToast();

  const [goalkeeper, setGoalkeeper] = useState<Goalkeeper | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentTeam) return;
    try {
      const [gks, m, t] = await Promise.all([
        listGoalkeepers(currentTeam.id),
        listMatches(currentTeam.id, { isAdmin }),
        listTrainings(currentTeam.id),
      ]);
      setGoalkeeper(gks.find((g) => g.id === id) ?? null);
      setMatches(m.filter((match) => match.goalkeeper_id === id));
      setTrainings(t.filter((tr) => tr.goalkeeper_id === id));
    } finally {
      setLoading(false);
    }
  }, [currentTeam, isAdmin, id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.six }} />
      </ThemedView>
    );
  }

  if (!goalkeeper) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="accent" style={{ padding: Spacing.four }}>{t('goalkeeperProfile.notFound')}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Stats
  const matchesWithScore = matches.filter((m) => m.goals_scored != null && m.goals_conceded != null);
  const wins = matchesWithScore.filter((m) => m.goals_scored! > m.goals_conceded!).length;
  const draws = matchesWithScore.filter((m) => m.goals_scored! === m.goals_conceded!).length;
  const losses = matchesWithScore.filter((m) => m.goals_scored! < m.goals_conceded!).length;
  const cleanSheets = matchesWithScore.filter((m) => m.goals_conceded === 0).length;

  const rated = matches.filter((m) => m.rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, m) => sum + m.rating!, 0) / rated.length).toFixed(1)
    : '—';
  const avgConceded = matchesWithScore.length > 0
    ? (matchesWithScore.reduce((sum, m) => sum + m.goals_conceded!, 0) / matchesWithScore.length).toFixed(1)
    : '—';

  // Rating trend (last 5 rated matches)
  const ratingTrend = rated.slice(-5).map((m) => m.rating!);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
              <ThemedText style={[styles.avatarText, { color: colors.accent }]}>
                {goalkeeper.name.split(' ').map((w) => w.charAt(0).toUpperCase()).join('')}
              </ThemedText>
            </View>
            <ThemedText type="title">{goalkeeper.name}</ThemedText>
          </View>

          {/* Share button */}
          <Pressable
            onPress={async () => {
              setSharing(true);
              try {
                const uri = await generateGoalkeeperPdf(goalkeeper, matches, trainings.length);
                const Sharing = await import('expo-sharing');
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Report ${goalkeeper.name}` });
              } catch {
                showToast(t('goalkeeperProfile.pdfError'), 'error');
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            style={({ pressed }) => [styles.shareBtn, { borderColor: colors.accent }, pressed && { opacity: 0.7 }]}>
            {sharing
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <><Ionicons name="share-outline" size={16} color={colors.accent} /><ThemedText type="smallBold" style={{ color: colors.accent }}>{t('goalkeeperProfile.shareReport')}</ThemedText></>}
          </Pressable>

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <ThemedView type="card" style={styles.quickStat}>
              <ThemedText style={[styles.quickStatValue, { color: colors.accent }]}>{avgRating}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{t('stats.avgRating')}</ThemedText>
            </ThemedView>
            <ThemedView type="card" style={styles.quickStat}>
              <ThemedText style={styles.quickStatValue}>{matches.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{t('stats.matchesLabel')}</ThemedText>
            </ThemedView>
            <ThemedView type="card" style={styles.quickStat}>
              <ThemedText style={styles.quickStatValue}>{trainings.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{t('stats.trainingsLabel')}</ThemedText>
            </ThemedView>
          </View>

          {/* Risultati */}
          {matchesWithScore.length > 0 && (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('stats.results')}
              </ThemedText>
              <ThemedView type="card" style={styles.card}>
                <View style={styles.resultRow}>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: '#34C759' }]}>{wins}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">V</ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: colors.textSecondary }]}>{draws}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">P</ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: '#FF3B30' }]}>{losses}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">S</ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: '#5AC8FA' }]}>{cleanSheets}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">CS</ThemedText>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.avgRow}>
                  <ThemedText type="small" themeColor="textSecondary">{t('stats.avgConceded')}</ThemedText>
                  <ThemedText type="smallBold">{avgConceded}</ThemedText>
                </View>
              </ThemedView>
            </>
          )}

          {/* Trend voto */}
          {ratingTrend.length > 1 && (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('goalkeeperProfile.ratingTrend', { count: ratingTrend.length })}
              </ThemedText>
              <ThemedView type="card" style={styles.card}>
                <View style={styles.trendRow}>
                  {ratingTrend.map((r, i) => (
                    <View key={i} style={styles.trendItem}>
                      <View style={[styles.trendBar, { height: `${(r / 10) * 100}%`, backgroundColor: r >= 6 ? colors.accent : '#FF3B30' }]} />
                      <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '700' }}>{r}</ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>
            </>
          )}

          {/* Storico partite */}
          {matches.length > 0 && (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('goalkeeperProfile.matchHistory')}
              </ThemedText>
              {[...matches].reverse().slice(0, 10).map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </>
          )}

          {/* Empty */}
          {matches.length === 0 && trainings.length === 0 && (
            <ThemedView type="card" style={styles.emptyCard}>
              <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
              <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {t('goalkeeperProfile.noData')}
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  quickStats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  quickStat: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    marginLeft: Spacing.one,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultItem: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  resultNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: Spacing.two,
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.control,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.one,
  },
  emptyCard: {
    marginTop: Spacing.four,
    borderRadius: Radius.card,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
});
