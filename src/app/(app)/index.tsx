import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { haptic } from '@/hooks/use-haptic';
import { FadeIn } from '@/components/fade-in';
import { MatchRow } from '@/components/match-row';
import { SectionLabel } from '@/components/section-label';
import { SkeletonCard, SkeletonMatchRow } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { listMatches } from '@/lib/api/matches';
import { listTrainings } from '@/lib/api/trainings';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match, Training } from '@/types/database';
import { BottomTabInset, Fonts, Radius, Spacing } from '@/constants/theme';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function currentMonthPrefix() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function calcStreak(trainings: Training[]): number {
  if (trainings.length === 0) return 0;
  const weeks = new Set<string>();
  for (const t of trainings) {
    const d = new Date(t.training_date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    weeks.add(`${d.getFullYear()}-${week}`);
  }
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  let currentWeek = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  let currentYear = now.getFullYear();
  let streak = 0;
  while (weeks.has(`${currentYear}-${currentWeek}`)) {
    streak++;
    currentWeek--;
    if (currentWeek <= 0) {
      currentYear--;
      currentWeek = 52;
    }
  }
  return streak;
}

/* ── Mini stat ── */
function MiniStat({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: string;
  iconBg: string;
  value: string | number;
  label: string;
}) {
  return (
    <ThemedView type="card" style={styles.miniStat}>
      <View style={[styles.miniStatIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color="#fff" />
      </View>
      <ThemedText style={styles.miniStatValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.miniStatLabel}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

/* ── Empty state inline ── */
function EmptySection({ icon, text }: { icon: string; text: string }) {
  const colors = useTheme();
  return (
    <ThemedView type="card" style={styles.emptyCard}>
      <Ionicons name={icon as any} size={22} color={colors.textSecondary} style={{ opacity: 0.4 }} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
        {text}
      </ThemedText>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile, isAdmin, currentTeam, myGoalkeeperId } = useAuth();
  const colors = useTheme();
  const today = todayISO();
  const monthPrefix = currentMonthPrefix();

  const [allTrainings, setAllTrainings] = useState<Training[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [nextTraining, setNextTraining] = useState<Training | null | undefined>(undefined);
  const [nextMatch, setNextMatch] = useState<Match | null | undefined>(undefined);
  const [lastMatch, setLastMatch] = useState<Match | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    if (!currentTeam) return;
    listTrainings(currentTeam.id).then((data) => {
      const filtered = myGoalkeeperId
        ? data.filter((t) => !t.goalkeeper_id || t.goalkeeper_id === myGoalkeeperId)
        : data;
      setAllTrainings(filtered);
      const upcoming = filtered.filter((t) => t.training_date >= today);
      setNextTraining(upcoming[0] ?? null);
    });
    listMatches(currentTeam.id, { isAdmin }).then((data) => {
      const filtered = myGoalkeeperId
        ? data.filter((m) => !m.goalkeeper_id || m.goalkeeper_id === myGoalkeeperId)
        : data;
      setAllMatches(filtered);
      const upcoming = filtered.filter((m) => m.match_date >= today);
      setNextMatch(upcoming[0] ?? null);
      const past = filtered.filter((m) => m.match_date < today);
      setLastMatch(past.length > 0 ? past[past.length - 1] : null);
    });
  }, [currentTeam, isAdmin, today]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 600);
  }

  const name = profile?.full_name?.trim() || profile?.email || '';

  // Stats
  const trainingsThisMonth = allTrainings.filter((t) => t.training_date.startsWith(monthPrefix)).length;
  const matchesThisMonth = allMatches.filter((m) => m.match_date.startsWith(monthPrefix)).length;
  const streak = calcStreak(allTrainings);
  const rated = allMatches.filter((m) => m.rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, m) => sum + m.rating!, 0) / rated.length).toFixed(1)
    : '—';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {/* Greeting */}
          <ThemedText type="title" style={styles.greeting}>
            {t('home.greeting')}{name ? `, ${name.split(' ')[0]}` : ''}
          </ThemedText>

          {/* ── Mini stats ── */}
          <FadeIn delay={100}>
            <View style={styles.miniStatsRow}>
              <MiniStat icon="calendar-outline" iconBg="#5AC8FA" value={trainingsThisMonth} label={t('home.trainingsLabel')} />
              <MiniStat icon="football-outline" iconBg="#FF9500" value={matchesThisMonth} label={t('home.matchesLabel')} />
              <MiniStat icon="flame-outline" iconBg="#FF3B30" value={streak > 0 ? `${streak}w` : '—'} label={t('home.streakLabel')} />
            </View>
          </FadeIn>

          {/* ── Prossimo allenamento ── */}
          <FadeIn delay={200}>
            <View style={styles.section}>
              <SectionLabel>
                {t('home.nextTraining')}
              </SectionLabel>
              {nextTraining === undefined ? (
                <SkeletonCard />
              ) : nextTraining === null ? (
                <EmptySection icon="barbell-outline" text={t('home.noTrainingScheduled')} />
              ) : (
                <ThemedView type="card" style={styles.trainingCard}>
                  <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
                  <View style={styles.trainingCardContent}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDateLong(nextTraining.training_date)}
                    </ThemedText>
                    <ThemedText style={styles.trainingTitle}>{nextTraining.title}</ThemedText>
                    {formatTime(nextTraining.training_time) && (
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatTime(nextTraining.training_time)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </ThemedView>
              )}
            </View>
          </FadeIn>

          {/* ── Prossima partita ── */}
          <FadeIn delay={300}>
            <View style={styles.section}>
              <SectionLabel>
                {t('home.nextMatch')}
              </SectionLabel>
              {nextMatch === undefined ? (
                <SkeletonMatchRow />
              ) : nextMatch === null ? (
                <EmptySection icon="football-outline" text={t('home.noMatchScheduled')} />
              ) : (
                <MatchRow match={nextMatch} />
              )}
            </View>
          </FadeIn>

          {/* ── Ultima partita ── */}
          {lastMatch && (
            <FadeIn delay={400}>
              <View style={styles.section}>
                <SectionLabel>
                  {t('home.lastMatch')}
                </SectionLabel>
                <MatchRow match={lastMatch} />
              </View>
            </FadeIn>
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  greeting: {
    marginTop: Spacing.two,
  },
  /* ── Mini stats ── */
  miniStatsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  miniStat: {
    flex: 1,
    borderRadius: Radius.card,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    gap: Spacing.half,
  },
  miniStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
  },
  miniStatValue: {
    fontSize: 22,
    fontFamily: Fonts.sansBold,
    lineHeight: 26,
  },
  miniStatLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  /* ── Sections ── */
  section: {
    gap: Spacing.two,
  },
  /* ── Training card ── */
  trainingCard: {
    borderRadius: Radius.card,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  trainingCardContent: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  trainingTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
  },
  /* ── Empty state ── */
  emptyCard: {
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyText: {},
});
