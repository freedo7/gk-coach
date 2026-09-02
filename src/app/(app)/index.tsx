import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchRow } from '@/components/match-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { listMatches } from '@/lib/api/matches';
import { listTrainings, getTrainingByDate, type TrainingWithExercises } from '@/lib/api/trainings';
import { formatTime } from '@/lib/format';
import type { Match, Training } from '@/types/database';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

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

const DOT_TRAINING = { key: 'training', color: Colors.light.accent };
const DOT_MATCH = { key: 'match', color: Colors.light.danger };

export default function HomeScreen() {
  const { profile, isAdmin, currentTeam } = useAuth();
  const today = todayISO();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithExercises | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  // Carica tutti gli allenamenti e partite
  useFocusEffect(
    useCallback(() => {
      if (!currentTeam) return;
      listTrainings(currentTeam.id).then(setTrainings);
      listMatches(currentTeam.id, { isAdmin }).then(setMatches);
    }, [currentTeam])
  );

  // Carica dettaglio allenamento per il giorno selezionato
  useEffect(() => {
    if (!currentTeam) return;
    setLoadingDay(true);
    getTrainingByDate(selectedDate, currentTeam.id)
      .then(setSelectedTraining)
      .finally(() => setLoadingDay(false));
  }, [selectedDate, trainings, currentTeam]);

  // Partite del giorno selezionato
  const dayMatches = matches.filter((m) => m.match_date === selectedDate);

  // Costruisci i dots per il calendario
  const markedDates: Record<string, any> = {};

  for (const t of trainings) {
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
    selectedColor: Colors.light.accent,
  };

  const name = profile?.full_name?.trim() || profile?.email || '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.greeting}>
            Ciao{name ? `, ${name.split(' ')[0]}` : ''}
          </ThemedText>

          {/* Calendario */}
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
                textSectionTitleColor: Colors.light.textSecondary,
                dayTextColor: Colors.light.text,
                todayTextColor: Colors.light.accent,
                monthTextColor: Colors.light.text,
                arrowColor: Colors.light.accent,
                selectedDayBackgroundColor: Colors.light.accent,
                selectedDayTextColor: Colors.light.accentText,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
              }}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.light.accent }]} />
                <ThemedText type="small" themeColor="textSecondary">Allenamento</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.light.danger }]} />
                <ThemedText type="small" themeColor="textSecondary">Partita</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Dettaglio giorno */}
          {loadingDay ? (
            <ActivityIndicator color={Colors.light.accent} style={styles.loader} />
          ) : (
            <>
              {/* Allenamento del giorno */}
              {selectedTraining ? (
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                    ALLENAMENTO
                  </ThemedText>
                  <Link href={`/allenamenti/${selectedTraining.id}`} asChild>
                    <Pressable>
                      <ThemedView type="card" style={styles.dayCard}>
                        <ThemedText type="subtitle">{selectedTraining.title}</ThemedText>
                        {formatTime(selectedTraining.training_time) && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatTime(selectedTraining.training_time)}
                          </ThemedText>
                        )}
                        {selectedTraining.training_exercises.length > 0 && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {selectedTraining.training_exercises.length} esercizi
                          </ThemedText>
                        )}
                      </ThemedView>
                    </Pressable>
                  </Link>
                </View>
              ) : isAdmin ? (
                <Link href={`/allenamenti/new?date=${selectedDate}`} asChild>
                  <Pressable>
                    <ThemedView type="backgroundElement" style={styles.emptyCard}>
                      <ThemedText type="smallBold" themeColor="accent">
                        + Aggiungi allenamento
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Link>
              ) : null}

              {/* Partite del giorno */}
              {dayMatches.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                    {dayMatches.length === 1 ? 'PARTITA' : 'PARTITE'}
                  </ThemedText>
                  {dayMatches.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </View>
              )}

              {/* Nessun evento */}
              {!selectedTraining && dayMatches.length === 0 && !isAdmin && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Nessun evento in programma per questo giorno.
                </ThemedText>
              )}
            </>
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
    gap: Spacing.three,
  },
  greeting: {
    marginTop: Spacing.two,
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
  loader: {
    marginVertical: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  dayCard: {
    borderRadius: Radius.control,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  emptyCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
});
