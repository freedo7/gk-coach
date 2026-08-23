import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { getTrainingByDate, listTrainings, type TrainingWithExercises } from '@/lib/api/trainings';
import { formatTime } from '@/lib/format';
import type { Training } from '@/types/database';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AllenamentiScreen() {
  const { isAdmin } = useAuth();
  const today = todayISO();

  const [trainings, setTrainings] = useState<Training[] | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithExercises | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listTrainings().then(setTrainings);
    }, [])
  );

  useEffect(() => {
    setLoadingTraining(true);
    getTrainingByDate(selectedDate)
      .then(setSelectedTraining)
      .finally(() => setLoadingTraining(false));
  }, [selectedDate, trainings]);

  const markedDates: Record<string, any> = {};
  for (const training of trainings ?? []) {
    markedDates[training.training_date] = { marked: true, dotColor: Colors.light.accent };
  }
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: Colors.light.accent,
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Allenamenti</ThemedText>

          <ThemedView type="card" style={styles.calendarCard}>
            <Calendar
              current={selectedDate}
              firstDay={1}
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
                dotColor: Colors.light.accent,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
              }}
            />
          </ThemedView>

          {loadingTraining ? (
            <ActivityIndicator color={Colors.light.accent} style={styles.trainingLoader} />
          ) : selectedTraining ? (
            <Link href={`/allenamenti/${selectedTraining.id}`} asChild>
              <Pressable>
                <ThemedView type="card" style={styles.trainingCard}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    ALLENAMENTO
                  </ThemedText>
                  <ThemedText type="subtitle">{selectedTraining.title}</ThemedText>
                  {formatTime(selectedTraining.training_time) && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatTime(selectedTraining.training_time)}
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            </Link>
          ) : isAdmin ? (
            <Link href={`/allenamenti/new?date=${selectedDate}`} asChild>
              <Pressable>
                <ThemedView type="backgroundElement" style={styles.emptyTrainingCard}>
                  <ThemedText type="smallBold" themeColor="accent">
                    + Aggiungi allenamento per questo giorno
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nessun allenamento in programma per questo giorno.
            </ThemedText>
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
  calendarCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    paddingBottom: Spacing.two,
  },
  trainingLoader: {
    marginVertical: Spacing.two,
  },
  trainingCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
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
});
