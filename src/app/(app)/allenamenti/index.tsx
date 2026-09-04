import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/empty-state';
import { MatchRow } from '@/components/match-row';
import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useTheme } from '@/hooks/use-theme';
import { listMatches } from '@/lib/api/matches';
import { haptic } from '@/hooks/use-haptic';
import { deleteTraining, getTrainingByDate, listTrainings, toggleTrainingCompleted, type TrainingWithExercises } from '@/lib/api/trainings';
import { listGoalkeepers } from '@/lib/api/goalkeepers';
import { formatTime } from '@/lib/format';
import type { Goalkeeper, Match, Training } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AllenamentiScreen() {
  const { t, i18n } = useTranslation();

  // Configure calendar locale with translated strings — use current language as key
  const lang = i18n.language;
  LocaleConfig.locales[lang] = {
    monthNames: t('calendar.monthNames', { returnObjects: true }) as string[],
    monthNamesShort: t('calendar.monthNamesShort', { returnObjects: true }) as string[],
    dayNames: t('calendar.dayNames', { returnObjects: true }) as string[],
    dayNamesShort: t('calendar.dayNamesShort', { returnObjects: true }) as string[],
    today: t('calendar.today'),
  };
  LocaleConfig.defaultLocale = lang;
  const { isAdmin, currentTeam, myGoalkeeperId } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const today = todayISO();

  const [allTrainings, setAllTrainings] = useState<Training[] | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [goalkeepers, setGoalkeepers] = useState<Goalkeeper[]>([]);
  const [selectedGk, setSelectedGk] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithExercises | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter by selected goalkeeper
  const trainings = useMemo(() => {
    if (!allTrainings) return null;
    if (selectedGk) return allTrainings.filter((t) => t.goalkeeper_id === selectedGk || !t.goalkeeper_id);
    return allTrainings;
  }, [allTrainings, selectedGk]);

  const matches = useMemo(() => {
    if (selectedGk) return allMatches.filter((m) => m.goalkeeper_id === selectedGk || !m.goalkeeper_id);
    return allMatches;
  }, [allMatches, selectedGk]);

  // Track which dates have trainings and/or matches
  const trainingDatesSet = useMemo(() => new Set((trainings ?? []).map((tr) => tr.training_date)), [trainings]);
  const matchDatesSet = useMemo(() => new Set(matches.map((m) => m.match_date)), [matches]);

  const loadData = useCallback(() => {
    if (!currentTeam) return;
    listTrainings(currentTeam.id).then((data) => {
      const filtered = myGoalkeeperId
        ? data.filter((t) => !t.goalkeeper_id || t.goalkeeper_id === myGoalkeeperId)
        : data;
      setAllTrainings(filtered);
    });
    listMatches(currentTeam.id, { isAdmin }).then((data) => {
      const filtered = myGoalkeeperId
        ? data.filter((m) => !m.goalkeeper_id || m.goalkeeper_id === myGoalkeeperId)
        : data;
      setAllMatches(filtered);
    });
    if (isAdmin) {
      listGoalkeepers(currentTeam.id).then(setGoalkeepers);
    }
  }, [currentTeam, isAdmin, myGoalkeeperId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 600);
  }

  const [prevDate, setPrevDate] = useState(selectedDate);
  useEffect(() => {
    if (!currentTeam) return;
    const dateChanged = selectedDate !== prevDate;
    if (dateChanged) {
      setPrevDate(selectedDate);
      setSelectedTraining(null);
      setLoadingTraining(true);
    }
    getTrainingByDate(selectedDate, currentTeam.id)
      .then(setSelectedTraining)
      .finally(() => setLoadingTraining(false));
  }, [selectedDate, allTrainings, selectedGk, currentTeam]);

  const dayMatches = useMemo(
    () => matches.filter((m) => m.match_date === selectedDate),
    [matches, selectedDate],
  );

  // Custom day component for colored rings
  const renderDay = useCallback(({ date, state }: { date?: DateData; state?: string }) => {
    if (!date) return <View style={styles.dayCell} />;
    const dateStr = date.dateString;
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === today;
    const hasTraining = trainingDatesSet.has(dateStr);
    const hasMatch = matchDatesSet.has(dateStr);
    const disabled = state === 'disabled';

    // Ring color for the event type
    const eventRing = hasTraining && hasMatch
      ? colors.accent
      : hasTraining
        ? colors.accent
        : hasMatch
          ? colors.danger
          : null;

    return (
      <Pressable
        onPress={() => setSelectedDate(dateStr)}
        style={styles.dayCell}>
        {/* Outer event ring — visible when selected AND has event, or when both events on same day */}
        {hasTraining && hasMatch && (
          <View style={[styles.outerRing, { borderColor: colors.danger }]} />
        )}
        {isSelected && !hasTraining && !hasMatch ? null : isSelected && !(hasTraining && hasMatch) && eventRing && (
          <View style={[styles.outerRing, { borderColor: eventRing }]} />
        )}
        <View style={[
          styles.dayCircle,
          !isSelected && eventRing && !(hasTraining && hasMatch) && { borderWidth: 2.5, borderColor: eventRing },
          !isSelected && hasTraining && hasMatch && { borderWidth: 2.5, borderColor: colors.accent },
          isSelected && { backgroundColor: colors.accentSoft },
        ]}>
          <ThemedText style={[
            styles.dayText,
            disabled && { color: colors.textSecondary, opacity: 0.3 },
            isToday && !isSelected && { color: colors.accent, fontWeight: '800' },
            isSelected && { color: colors.accent, fontWeight: '800' },
          ]}>
            {date.day}
          </ThemedText>
        </View>
      </Pressable>
    );
  }, [selectedDate, today, trainingDatesSet, matchDatesSet, colors]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.pageHeader}>
          <ThemedText type="title">{t('trainings.title')}</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {/* Filtro portiere (solo admin con più di 1 portiere) */}
          {isAdmin && goalkeepers.length > 1 && (
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

          <ThemedView type="card" style={styles.calendarCard}>
            <Calendar
              key={lang}
              current={selectedDate}
              firstDay={1}
              dayComponent={renderDay}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: colors.textSecondary,
                monthTextColor: colors.text,
                arrowColor: colors.accent,
                textMonthFontWeight: '700',
              }}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <ThemedText type="small" themeColor="textSecondary">{t('trainings.trainingLegend')}</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <ThemedText type="small" themeColor="textSecondary">{t('trainings.matchLegend')}</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Allenamento del giorno */}
          {loadingTraining ? (
            <ActivityIndicator color={colors.accent} style={styles.trainingLoader} />
          ) : selectedTraining ? (
            <SwipeableRow
              enabled={isAdmin}
              onDelete={async () => {
                const prev = allTrainings;
                const prevSelected = selectedTraining;
                setAllTrainings((t) => t?.filter((x) => x.id !== selectedTraining.id) ?? null);
                setSelectedTraining(null);
                showToast(t('trainings.trainingDeleted'));
                try { await deleteTraining(selectedTraining.id); } catch { setAllTrainings(prev); setSelectedTraining(prevSelected); showToast(t('trainings.deleteError'), 'error'); }
              }}
              confirmTitle={t('trainings.deleteTrainingConfirm')}
              confirmMessage={selectedTraining.title}
            >
              <Link href={`/allenamenti/${selectedTraining.id}`} asChild>
                <Pressable>
                  <ThemedView type="card" style={styles.trainingCard}>
                    <View style={styles.trainingCardHeader}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {t('trainings.training')}
                      </ThemedText>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          haptic('light');
                          const newVal = !selectedTraining.completed;
                          setSelectedTraining({ ...selectedTraining, completed: newVal });
                          toggleTrainingCompleted(selectedTraining.id, newVal).catch(() => {
                            setSelectedTraining({ ...selectedTraining, completed: !newVal });
                            showToast(t('common.error'), 'error');
                          });
                        }}
                        hitSlop={12}>
                        <Ionicons
                          name={selectedTraining.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={selectedTraining.completed ? colors.accent : colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                    <ThemedText type="subtitle" style={selectedTraining.completed && styles.completedText}>{selectedTraining.title}</ThemedText>
                    {formatTime(selectedTraining.training_time) && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatTime(selectedTraining.training_time)}
                      </ThemedText>
                    )}
                  </ThemedView>
                </Pressable>
              </Link>
            </SwipeableRow>
          ) : isAdmin ? (
            <Link href={`/allenamenti/new?date=${selectedDate}`} asChild>
              <Pressable>
                <ThemedView type="backgroundElement" style={styles.emptyTrainingCard}>
                  <ThemedText type="smallBold" themeColor="accent">
                    {t('trainings.addTrainingForDay')}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          ) : (
            <EmptyState icon="calendar-outline" title={t('trainings.noEvents')} subtitle={t('trainings.noTrainingsForDay')} />
          )}

          {/* Libreria esercizi */}
          <Pressable
            onPress={() => router.push('/esercizi')}
            style={({ pressed }) => [styles.libraryBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.7 }]}>
            <Ionicons name="book-outline" size={20} color={colors.accentText} />
            <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('trainings.exerciseLibrary')}</ThemedText>
          </Pressable>

          {/* Partite del giorno */}
          {dayMatches.length > 0 && (
            <View style={styles.matchSection}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {dayMatches.length === 1 ? t('trainings.match') : t('trainings.matchesPlural')}
              </ThemedText>
              {dayMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  calendarCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    paddingBottom: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 40,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  trainingLoader: {
    marginVertical: Spacing.two,
  },
  trainingCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  trainingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  emptyTrainingCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  matchSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  gkFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  gkChipWrapper: {},
  gkChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
});
