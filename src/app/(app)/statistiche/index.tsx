import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { listMatches, listAllPerformances } from '@/lib/api/matches';
import { listTrainings } from '@/lib/api/trainings';
import { listGoalkeepers } from '@/lib/api/goalkeepers';
import { supabase } from '@/lib/supabase';
import type { Match, Training, Goalkeeper, MatchPerformance } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

/* ── helpers ── */

function weekKey(dateStr: string) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function weeksAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

function shortWeekLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function timeCutoff(period: 'all' | 'season' | '3m' | '1m'): string | null {
  if (period === 'all') return null;
  const now = new Date();
  if (period === '1m') {
    now.setMonth(now.getMonth() - 1);
  } else if (period === '3m') {
    now.setMonth(now.getMonth() - 3);
  } else {
    // season: from August 1 of current or previous year
    const seasonStart = now.getMonth() >= 7
      ? new Date(now.getFullYear(), 7, 1)
      : new Date(now.getFullYear() - 1, 7, 1);
    return seasonStart.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

interface CategoryCount {
  name: string;
  count: number;
}

/* ── Stat card ── */
function StatCard({ icon, iconBg, label, value, sub }: {
  icon: string; iconBg: string; label: string; value: string | number; sub?: string;
}) {
  const colors = useTheme();
  return (
    <ThemedView type="card" style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color="#fff" />
      </View>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      {sub && <ThemedText type="small" themeColor="textSecondary">{sub}</ThemedText>}
    </ThemedView>
  );
}

/* ── Bar chart (simple) ── */
function MiniBarChart({ data, accentColor }: { data: { label: string; value: number }[]; accentColor: string }) {
  const colors = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.chartContainer}>
      {data.map((d, i) => (
        <View key={i} style={styles.chartCol}>
          <View style={styles.chartBarWrapper}>
            <View
              style={[
                styles.chartBar,
                {
                  height: `${(d.value / max) * 100}%`,
                  backgroundColor: d.value > 0 ? accentColor : colors.backgroundElement,
                },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.chartLabel}>
            {d.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/* ── Main screen ── */
export default function StatisticheScreen() {
  const { t } = useTranslation();
  const { isAdmin, currentTeam, myGoalkeeperId } = useAuth();
  const colors = useTheme();
  const router = useRouter();

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allTrainings, setAllTrainings] = useState<Training[]>([]);
  const [allPerformances, setAllPerformances] = useState<MatchPerformance[]>([]);
  const [goalkeepers, setGoalkeepers] = useState<Goalkeeper[]>([]);
  const [selectedGk, setSelectedGk] = useState<string | null>(myGoalkeeperId);
  const [timePeriod, setTimePeriod] = useState<'all' | 'season' | '3m' | '1m'>('all');
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentTeam) return;
    try {
      const [m, t, gks, perfs, catData] = await Promise.all([
        listMatches(currentTeam.id, { isAdmin }),
        listTrainings(currentTeam.id),
        listGoalkeepers(currentTeam.id),
        listAllPerformances(currentTeam.id),
        supabase
          .from('training_exercises')
          .select('exercise:exercises(category:exercise_categories(name))')
          .eq('exercise.team_id', currentTeam.id)
          .then(({ data }) => data),
      ]);
      setAllMatches(m);
      setAllTrainings(t);
      setAllPerformances(perfs);
      setGoalkeepers(gks);

      // Count categories
      const catMap: Record<string, number> = {};
      (catData ?? []).forEach((te: any) => {
        const name = te.exercise?.category?.name;
        if (name) catMap[name] = (catMap[name] ?? 0) + 1;
      });
      setCategories(
        Object.entries(catMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );
    } finally {
      setLoading(false);
    }
  }, [currentTeam, isAdmin]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // ── Filter by goalkeeper + time period ──
  const cutoffDate = useMemo(() => timeCutoff(timePeriod), [timePeriod]);

  // Performance lookup: per ogni partita, le performance di quel portiere
  const perfByMatch = useMemo(() => {
    const map: Record<string, MatchPerformance> = {};
    if (!selectedGk) return map;
    allPerformances
      .filter((p) => p.goalkeeper_id === selectedGk)
      .forEach((p) => { map[p.match_id] = p; });
    return map;
  }, [allPerformances, selectedGk]);

  const matches = useMemo(() => {
    let filtered = allMatches;
    if (selectedGk) {
      // Includi partite assegnate al portiere O che hanno una performance per lui
      filtered = filtered.filter((m) => m.goalkeeper_id === selectedGk || perfByMatch[m.id]);
    }
    if (cutoffDate) filtered = filtered.filter((m) => m.match_date >= cutoffDate);
    return filtered;
  }, [allMatches, selectedGk, cutoffDate, perfByMatch]);
  const trainings = useMemo(() => {
    let filtered = selectedGk ? allTrainings.filter((t) => t.goalkeeper_id === selectedGk) : allTrainings;
    if (cutoffDate) filtered = filtered.filter((t) => t.training_date >= cutoffDate);
    return filtered;
  }, [allTrainings, selectedGk, cutoffDate]);

  // ── Computed stats ──
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const matchesThisMonth = matches.filter((m) => m.match_date.startsWith(currentMonth));
  const trainingsThisMonth = trainings.filter((t) => t.training_date.startsWith(currentMonth));

  const matchesWithScore = matches.filter((m) => m.goals_scored != null && m.goals_conceded != null);
  const wins = matchesWithScore.filter((m) => m.goals_scored! > m.goals_conceded!).length;
  const draws = matchesWithScore.filter((m) => m.goals_scored! === m.goals_conceded!).length;
  const losses = matchesWithScore.filter((m) => m.goals_scored! < m.goals_conceded!).length;
  const cleanSheets = useMemo(() => {
    if (!selectedGk) return matchesWithScore.filter((m) => m.goals_conceded === 0).length;
    // Per portiere singolo: usa goals_conceded dalla performance se disponibile
    return matches.filter((m) => {
      const perf = perfByMatch[m.id];
      if (perf && perf.goals_conceded != null) return perf.goals_conceded === 0;
      if (m.goalkeeper_id === selectedGk && m.goals_conceded != null) return m.goals_conceded === 0;
      return false;
    }).length;
  }, [matches, matchesWithScore, selectedGk, perfByMatch]);

  // Rating: per portiere singolo usa la performance se disponibile
  const ratingData = useMemo(() => {
    if (!selectedGk) {
      const rated = matches.filter((m) => m.rating != null);
      return { count: rated.length, avg: rated.length > 0 ? rated.reduce((s, m) => s + m.rating!, 0) / rated.length : null };
    }
    const ratings: number[] = [];
    matches.forEach((m) => {
      const perf = perfByMatch[m.id];
      if (perf?.rating != null) { ratings.push(perf.rating); return; }
      if (m.goalkeeper_id === selectedGk && m.rating != null) ratings.push(m.rating);
    });
    return { count: ratings.length, avg: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null };
  }, [matches, selectedGk, perfByMatch]);
  const avgRating = ratingData.avg != null ? ratingData.avg.toFixed(1) : '—';

  const avgConceded = matchesWithScore.length > 0
    ? (matchesWithScore.reduce((sum, m) => sum + m.goals_conceded!, 0) / matchesWithScore.length).toFixed(1)
    : '—';

  // Match type distribution
  const byType = { amichevole: 0, campionato: 0, coppa: 0 };
  matches.forEach((m) => { byType[m.match_type] = (byType[m.match_type] ?? 0) + 1; });

  // Weekly activity (last 8 weeks)
  const cutoff = weeksAgo(8);
  const recentTrainings = trainings.filter((t) => t.training_date >= cutoff);
  const weekMap: Record<string, number> = {};
  // initialize last 8 weeks
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = weekKey(d.toISOString().slice(0, 10));
    weekMap[key] = 0;
  }
  recentTrainings.forEach((t) => {
    const key = weekKey(t.training_date);
    if (key in weekMap) weekMap[key]++;
  });
  const weeklyData = Object.entries(weekMap).map(([key, value]) => ({
    label: key.split('-W')[1],
    value,
  }));

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.scrollContent}>
            <ThemedText type="title">{t('stats.title')}</ThemedText>
            <View style={{ marginTop: Spacing.three }}>
              <SkeletonList count={4} type="stat" />
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <ThemedText type="title">{t('stats.title')}</ThemedText>

          {/* ── Filtro portiere ── */}
          {goalkeepers.length > 0 && (
            <View style={styles.gkFilter}>
              <Pressable
                onPress={() => { haptic('light'); setSelectedGk(null); }}
                style={styles.gkChipWrapper}>
                <ThemedView
                  type={selectedGk === null ? undefined : 'backgroundElement'}
                  style={[styles.gkChip, selectedGk === null && { backgroundColor: colors.accent }]}>
                  <ThemedText
                    type="small"
                    style={{ color: selectedGk === null ? colors.accentText : colors.textSecondary, fontWeight: '600' }}>
                    {t('common.all')}
                  </ThemedText>
                </ThemedView>
              </Pressable>
              {goalkeepers.map((gk) => {
                const sel = selectedGk === gk.id;
                return (
                  <Pressable
                    key={gk.id}
                    onPress={() => { haptic('light'); setSelectedGk(sel ? null : gk.id); }}
                    style={styles.gkChipWrapper}>
                    <ThemedView
                      type={sel ? undefined : 'backgroundElement'}
                      style={[styles.gkChip, sel && { backgroundColor: colors.accent }]}>
                      <ThemedText
                        type="small"
                        style={{ color: sel ? colors.accentText : colors.text, fontWeight: '600' }}>
                        {gk.name}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Filtro periodo ── */}
          <View style={styles.gkFilter}>
            {([
              { value: 'all' as const, label: t('stats.periodAll') },
              { value: 'season' as const, label: t('stats.periodSeason') },
              { value: '3m' as const, label: t('stats.period3m') },
              { value: '1m' as const, label: t('stats.period1m') },
            ]).map(({ value, label }) => {
              const sel = timePeriod === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => { haptic('light'); setTimePeriod(value); }}
                  style={styles.gkChipWrapper}>
                  <ThemedView
                    type={sel ? undefined : 'backgroundElement'}
                    style={[styles.gkChip, sel && { backgroundColor: colors.accent }]}>
                    <ThemedText
                      type="small"
                      style={{ color: sel ? colors.accentText : colors.textSecondary, fontWeight: '600' }}>
                      {label}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>

          {selectedGk && (
            <Pressable
              onPress={() => router.push(`/statistiche/portiere/${selectedGk}` as any)}
              style={({ pressed }) => [styles.schedaBtn, { borderColor: colors.accent }, pressed && { opacity: 0.7 }]}>
              <Ionicons name="person-outline" size={16} color={colors.accent} />
              <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('stats.viewFullProfile')}</ThemedText>
              <Ionicons name="chevron-forward" size={14} color={colors.accent} />
            </Pressable>
          )}

          {/* ── Riepilogo ── */}
          <View style={styles.statsGrid}>
            <StatCard icon="football-outline" iconBg="#FF9500" label={t('stats.matchesLabel')} value={matches.length} sub={`${matchesThisMonth.length} ${t('stats.thisMonth')}`} />
            <StatCard icon="calendar-outline" iconBg="#5AC8FA" label={t('stats.trainingsLabel')} value={trainings.length} sub={`${trainingsThisMonth.length} ${t('stats.thisMonth')}`} />
            <StatCard icon="star-outline" iconBg="#FFD60A" label={t('stats.avgRating')} value={avgRating} sub={`${ratingData.count} ${t('stats.rated')}`} />
            <StatCard icon="shield-checkmark-outline" iconBg="#34C759" label={t('stats.cleanSheets')} value={cleanSheets} sub={matchesWithScore.length > 0 ? `${Math.round((cleanSheets / matchesWithScore.length) * 100)}%` : '—'} />
          </View>

          {/* ── Risultati ── */}
          {matchesWithScore.length > 0 && (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('stats.results')}
              </ThemedText>
              <ThemedView type="card" style={styles.card}>
                <View style={styles.resultRow}>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: '#34C759' }]}>{wins}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{t('stats.wins')}</ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: colors.textSecondary }]}>{draws}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{t('stats.draws')}</ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={[styles.resultNumber, { color: '#FF3B30' }]}>{losses}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{t('stats.losses')}</ThemedText>
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

          {/* ── Attività settimanale ── */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {t('stats.weeklyTrainings')}
          </ThemedText>
          <ThemedView type="card" style={styles.card}>
            <MiniBarChart data={weeklyData} accentColor={colors.accent} />
          </ThemedView>

          {/* ── Tipo partite ── */}
          {matches.length > 0 && (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('stats.matchesByType')}
              </ThemedText>
              <ThemedView type="card" style={styles.card}>
                {([
                  { key: 'campionato' as const, label: t('matches.league'), color: '#FF9500' },
                  { key: 'coppa' as const, label: t('matches.cup'), color: '#AF52DE' },
                  { key: 'amichevole' as const, label: t('matches.friendly'), color: '#5AC8FA' },
                ]).map(({ key, label, color }) => (
                  <View key={key} style={styles.typeRow}>
                    <View style={[styles.typeDot, { backgroundColor: color }]} />
                    <ThemedText type="default" style={{ flex: 1 }}>{label}</ThemedText>
                    <ThemedText type="smallBold">{byType[key]}</ThemedText>
                    <View style={styles.typeBarBg}>
                      <View
                        style={[
                          styles.typeBarFill,
                          {
                            backgroundColor: color,
                            width: `${matches.length > 0 ? (byType[key] / matches.length) * 100 : 0}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </ThemedView>
            </>
          )}

          {/* ── Categorie più allenate ── */}
          {categories.length > 0 && (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('stats.topCategories')}
              </ThemedText>
              <ThemedView type="card" style={styles.card}>
                {categories.slice(0, 5).map((cat, i) => (
                  <View key={cat.name} style={[styles.categoryRow, i < Math.min(categories.length, 5) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
                    <ThemedText type="smallBold" style={styles.categoryRank}>{i + 1}</ThemedText>
                    <ThemedText type="default" style={{ flex: 1 }}>{cat.name}</ThemedText>
                    <ThemedText type="smallBold" themeColor="accent">{cat.count}</ThemedText>
                  </View>
                ))}
              </ThemedView>
            </>
          )}

          {/* Empty state */}
          {matches.length === 0 && trainings.length === 0 && (
            <ThemedView type="card" style={[styles.card, styles.emptyCard]}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.textSecondary} />
              <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {t('stats.emptyStats')}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.one,
  },
  gkFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  gkChipWrapper: {},
  gkChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  schedaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.control,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    marginLeft: Spacing.one,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  statCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    width: '48%',
    flexGrow: 1,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
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
    fontSize: 28,
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
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: Spacing.one,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  chartBarWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 9,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeBarBg: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  typeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  categoryRank: {
    width: 20,
    textAlign: 'center',
    opacity: 0.4,
  },
  emptyCard: {
    marginTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  pressed: { opacity: 0.7 },
});
