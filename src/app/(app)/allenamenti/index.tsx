import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
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
import { formatTime } from '@/lib/format';
import type { Match, Training } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

LocaleConfig.locales['it'] = {
  monthNames: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
  monthNamesShort: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'],
  dayNames: ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'],
  dayNamesShort: ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'],
  today: 'Oggi',
};
LocaleConfig.defaultLocale = 'it';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AllenamentiScreen() {
  const { t } = useTranslation();
  const { isAdmin, currentTeam } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const today = todayISO();

  const [trainings, setTrainings] = useState<Training[] | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithExercises | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const DOT_TRAINING = useMemo(() => ({ key: 'training', color: colors.accent }), [colors.accent]);
  const DOT_MATCH = useMemo(() => ({ key: 'match', color: colors.danger }), [colors.danger]);

  const loadData = useCallback(() => {
    if (!currentTeam) return;
    listTrainings(currentTeam.id).then(setTrainings);
    listMatches(currentTeam.id, { isAdmin }).then(setMatches);
  }, [currentTeam, isAdmin]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 600);
  }

  useEffect(() => {
    if (!currentTeam) return;
    setLoadingTraining(true);
    getTrainingByDate(selectedDate, currentTeam.id)
      .then(setSelectedTraining)
      .finally(() => setLoadingTraining(false));
  }, [selectedDate, trainings, currentTeam]);

  const dayMatches = useMemo(
    () => matches.filter((m) => m.match_date === selectedDate),
    [matches, selectedDate],
  );

  // Multi-dot: allenamenti verdi, partite rosse
  const markedDates: Record<string, any> = {};
  for (const t of trainings ?? []) {
    markedDates[t.training_date] = {
      ...(markedDates[t.training_date] ?? {}),
      dots: [...(markedDates[t.training_date]?.dots ?? []), DOT_TRAINING],
    };
  }
  for (const m of matches) {
    markedDates[m.match_date] = {
      ...(markedDates[m.match_date] ?? {}),
      dots: [...(markedDates[m.match_date]?.dots ?? []), DOT_MATCH],
    };
  }
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: colors.accent,
  };

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
          <ThemedView type="card" style={styles.calendarCard}>
            <Calendar
              current={selectedDate}
              firstDay={1}
              markingType="multi-dot"
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: colors.textSecondary,
                dayTextColor: colors.text,
                todayTextColor: colors.accent,
                monthTextColor: colors.text,
                arrowColor: colors.accent,
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: colors.accentText,
                dotColor: colors.accent,
                textDayFontWeight: '500',
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
                const prev = trainings;
                const prevSelected = selectedTraining;
                setTrainings((t) => t?.filter((x) => x.id !== selectedTraining.id) ?? null);
                setSelectedTraining(null);
                showToast(t('trainings.trainingDeleted'));
                try { await deleteTraining(selectedTraining.id); } catch { setTrainings(prev); setSelectedTraining(prevSelected); showToast(t('trainings.deleteError'), 'error'); }
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
});
