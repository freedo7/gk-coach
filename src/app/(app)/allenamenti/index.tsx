import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/empty-state';
import { FadeIn } from '@/components/fade-in';
import { MatchRow } from '@/components/match-row';
import { SkeletonCard } from '@/components/skeleton';
import { SwipeableRow } from '@/components/swipeable-row';
import { SectionLabel } from '@/components/section-label';
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
import { BottomTabInset, Fonts, Radius, Spacing } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Get the week (Mon-Sun) containing a given date string */
function getWeekDays(dateStr: string): { dateString: string; day: number; isCurrentMonth: boolean }[] {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const month = d.getMonth();
  const days: { dateString: string; day: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      dateString: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
      day: cur.getDate(),
      isCurrentMonth: cur.getMonth() === month,
    });
  }
  return days;
}

function formatMonthYear(dateStr: string, monthNames: string[]): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AllenamentiScreen() {
  const { t, i18n } = useTranslation();

  // Configure calendar locale
  const lang = i18n.language;
  const monthNames = t('calendar.monthNames', { returnObjects: true }) as string[];
  const dayNamesShort = t('calendar.dayNamesShort', { returnObjects: true }) as string[];
  const weekDayLabels = [...dayNamesShort.slice(1), dayNamesShort[0]];

  LocaleConfig.locales[lang] = {
    monthNames,
    monthNamesShort: t('calendar.monthNamesShort', { returnObjects: true }) as string[],
    dayNames: t('calendar.dayNames', { returnObjects: true }) as string[],
    dayNamesShort,
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
  const [calendarExpanded, setCalendarExpanded] = useState(false);

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

  // ── Week strip ──
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const swipeHandled = useRef(false);

  // Slide animation for week transitions
  const slideX = useSharedValue(0);
  const slideOpacity = useSharedValue(1);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: slideOpacity.value,
  }));

  function navigateWeek(direction: -1 | 1) {
    haptic('light');
    // Animate: slide out in direction, then snap to opposite side and slide in
    const slideOut = direction === 1 ? -60 : 60;
    const slideIn = direction === 1 ? 60 : -60;

    slideX.value = withTiming(slideOut, { duration: 150, easing: Easing.out(Easing.cubic) }, () => {
      // Update date on JS thread
      runOnJS(doNavigateWeek)(direction);
      // Snap to opposite side instantly
      slideX.value = slideIn;
      slideOpacity.value = 0.3;
      // Slide in
      slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      slideOpacity.value = withTiming(1, { duration: 200 });
    });
  }

  function doNavigateWeek(direction: -1 | 1) {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction * 7);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  }

  function toggleCalendar() {
    haptic('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalendarExpanded(!calendarExpanded);
  }

  // Gesture: swipe left/right = navigate weeks, down = expand calendar
  const weekSwipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-25, 25])
    .activeOffsetY([-100, 25])
    .onBegin(() => { swipeHandled.current = false; })
    .onUpdate((e) => {
      if (swipeHandled.current) return;
      // Swipe down → expand
      if (e.translationY > 35 && Math.abs(e.translationX) < 30) {
        swipeHandled.current = true;
        toggleCalendar();
        return;
      }
      // Swipe left/right → navigate weeks
      if (Math.abs(e.translationX) > 40 && Math.abs(e.translationY) < 30) {
        swipeHandled.current = true;
        navigateWeek(e.translationX < 0 ? 1 : -1);
      }
    });

  // Gesture: swipe up on full calendar = collapse
  const calendarSwipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-25, 100])
    .onBegin(() => { swipeHandled.current = false; })
    .onUpdate((e) => {
      if (swipeHandled.current) return;
      if (e.translationY < -35 && Math.abs(e.translationX) < 30) {
        swipeHandled.current = true;
        toggleCalendar();
      }
    });

  // Custom day component for the full calendar
  const renderDay = useCallback(({ date, state }: { date?: DateData; state?: string }) => {
    if (!date) return <View style={styles.dayCell} />;
    const dateStr = date.dateString;
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === today;
    const hasTraining = trainingDatesSet.has(dateStr);
    const hasMatch = matchDatesSet.has(dateStr);
    const disabled = state === 'disabled';

    const eventRing = hasTraining && hasMatch
      ? colors.accent
      : hasTraining
        ? colors.accent
        : hasMatch
          ? colors.danger
          : null;

    return (
      <Pressable
        onPress={() => { setSelectedDate(dateStr); }}
        style={styles.dayCell}>
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
            isToday && !isSelected && { color: colors.accent, fontFamily: Fonts.sansBold },
            isSelected && { color: colors.accent, fontFamily: Fonts.sansBold },
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
        {/* Header */}
        <View style={styles.pageHeader}>
          <ThemedText type="title">{t('trainings.title')}</ThemedText>
          <Pressable
            onPress={() => router.push('/esercizi')}
            style={({ pressed }) => [styles.headerIconBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.7 }]}>
            <Ionicons name="book-outline" size={18} color={colors.accentText} />
          </Pressable>
        </View>

        {/* Filtro portiere — fuori dallo scroll */}
        {isAdmin && goalkeepers.length > 1 && (
          <View style={styles.gkFilterOuter}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gkFilter}>
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
            </ScrollView>
          </View>
        )}

        {/* Calendar section — fuori dallo scroll, gestisce i gesti autonomamente */}
        <View style={styles.calendarOuter}>
          <ThemedView type="card" style={styles.calendarCard}>
            {calendarExpanded ? (
              /* ── Full month calendar ── */
              <GestureDetector gesture={calendarSwipe}>
                <View>
                  <Calendar
                    key={lang}
                    current={selectedDate}
                    firstDay={1}
                    dayComponent={renderDay}
                    onMonthChange={(month: DateData) => {
                      setSelectedDate(month.dateString);
                    }}
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
                </View>
              </GestureDetector>
            ) : (
              /* ── Week strip ── */
              <GestureDetector gesture={weekSwipe}>
                <View>
                  {/* Month/year + nav arrows */}
                  <View style={styles.weekHeader}>
                    <Pressable onPress={() => navigateWeek(-1)} hitSlop={12}>
                      <Ionicons name="chevron-back" size={20} color={colors.accent} />
                    </Pressable>
                    <ThemedText type="smallBold">
                      {formatMonthYear(selectedDate, monthNames)}
                    </ThemedText>
                    <Pressable onPress={() => navigateWeek(1)} hitSlop={12}>
                      <Ionicons name="chevron-forward" size={20} color={colors.accent} />
                    </Pressable>
                  </View>

                  {/* Day labels + day circles */}
                  <Animated.View style={[styles.weekRow, slideStyle]}>
                    {weekDays.map((day, i) => {
                      const isSelected = day.dateString === selectedDate;
                      const isToday = day.dateString === today;
                      const hasTraining = trainingDatesSet.has(day.dateString);
                      const hasMatch = matchDatesSet.has(day.dateString);

                      // Ring color logic (same as full calendar)
                      const ringColor = hasTraining && hasMatch
                        ? colors.accent
                        : hasTraining
                          ? colors.accent
                          : hasMatch
                            ? colors.danger
                            : null;

                      return (
                        <Pressable
                          key={day.dateString}
                          onPress={() => setSelectedDate(day.dateString)}
                          style={styles.weekDayCol}>
                          <ThemedText type="small" themeColor="textSecondary" style={styles.weekDayLabel}>
                            {weekDayLabels[i]}
                          </ThemedText>
                          <View style={styles.weekDayOuter}>
                            {/* Outer ring for dual events (training + match) */}
                            {hasTraining && hasMatch && !isSelected && (
                              <View style={[styles.weekOuterRing, { borderColor: colors.danger }]} />
                            )}
                            <View style={[
                              styles.weekDayCircle,
                              // Event ring border
                              !isSelected && ringColor && !(hasTraining && hasMatch) && { borderWidth: 2.5, borderColor: ringColor },
                              !isSelected && hasTraining && hasMatch && { borderWidth: 2.5, borderColor: colors.accent },
                              // Selected state
                              isSelected && { backgroundColor: colors.accentSoft },
                            ]}>
                              <ThemedText style={[
                                styles.weekDayNum,
                                !day.isCurrentMonth && { opacity: 0.3 },
                                isToday && !isSelected && { color: colors.accent, fontFamily: Fonts.sansBold },
                                isSelected && { color: colors.accent, fontFamily: Fonts.sansBold },
                              ]}>
                                {day.day}
                              </ThemedText>
                            </View>
                          </View>
                          {/* Event dots below */}
                          <View style={styles.dotsRow}>
                            {hasTraining && <View style={[styles.eventDot, { backgroundColor: colors.accent }]} />}
                            {hasMatch && <View style={[styles.eventDot, { backgroundColor: colors.danger }]} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </Animated.View>
                </View>
              </GestureDetector>
            )}

            {/* Toggle button */}
            <Pressable onPress={toggleCalendar} style={styles.toggleBtn}>
              <Ionicons
                name={calendarExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </ThemedView>
        </View>

        {/* Scrollable content */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Allenamento del giorno */}
          {loadingTraining ? (
            <SkeletonCard />
          ) : selectedTraining ? (
            <FadeIn>
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
            </FadeIn>
          ) : isAdmin ? (
            <FadeIn>
              <Link href={`/allenamenti/new?date=${selectedDate}`} asChild>
                <Pressable>
                  <ThemedView type="backgroundElement" style={styles.emptyTrainingCard}>
                    <ThemedText type="smallBold" themeColor="accent">
                      {t('trainings.addTrainingForDay')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>
            </FadeIn>
          ) : (
            <FadeIn>
              <EmptyState icon="calendar-outline" title={t('trainings.noEvents')} subtitle={t('trainings.noTrainingsForDay')} />
            </FadeIn>
          )}

          {/* Partite del giorno */}
          {dayMatches.length > 0 && (
            <FadeIn delay={100}>
              <View style={styles.matchSection}>
                <SectionLabel>
                  {dayMatches.length === 1 ? t('trainings.match') : t('trainings.matchesPlural')}
                </SectionLabel>
                {dayMatches.map((m, i) => (
                  <FadeIn key={m.id} delay={150 + i * 60}>
                    <MatchRow match={m} />
                  </FadeIn>
                ))}
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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── GK filter ── */
  gkFilterOuter: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  gkFilter: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  gkChipWrapper: {},
  gkChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  /* ── Calendar card ── */
  calendarOuter: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  calendarCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    paddingBottom: Spacing.one,
  },
  /* ── Week strip ── */
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  weekDayCol: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  weekDayLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekDayOuter: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekOuterRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  weekDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayNum: {
    fontSize: 15,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  /* ── Full calendar ── */
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
  /* ── Scrollable content ── */
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
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
  matchSection: {
    gap: Spacing.two,
  },
});
