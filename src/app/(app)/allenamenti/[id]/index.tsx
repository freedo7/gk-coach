import { useFocusEffect } from '@react-navigation/native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { deleteTraining, getTraining, type TrainingWithExercises } from '@/lib/api/trainings';
import { formatDateLong, formatTime } from '@/lib/format';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function AllenamentoDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [training, setTraining] = useState<TrainingWithExercises | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTraining(id)
        .then((data) => {
          if (!cancelled) setTraining(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function handleDelete() {
    Alert.alert('Eliminare l\'allenamento?', training?.title, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteTraining(id);
          router.back();
        },
      },
    ]);
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="accent">{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!training) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      </ThemedView>
    );
  }

  const time = formatTime(training.training_time);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">{training.title}</ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary">
            {formatDateLong(training.training_date)}
            {time ? ` · ${time}` : ''}
          </ThemedText>

          {training.notes && <ThemedText style={styles.notes}>{training.notes}</ThemedText>}

          {training.training_exercises.length > 0 && (
            <View style={styles.exerciseSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ESERCIZI
              </ThemedText>
              {training.training_exercises.map((te) => (
                <ThemedView key={te.id} type="card" style={styles.exerciseCard}>
                  <ThemedText type="smallBold">{te.exercise.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {te.exercise.description}
                  </ThemedText>
                  {te.exercise.video_url && (
                    <Pressable onPress={() => Linking.openURL(te.exercise.video_url!)}>
                      <ThemedText type="small" themeColor="accent">
                        ▶ Guarda il video
                      </ThemedText>
                    </Pressable>
                  )}
                  {te.note && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Nota: {te.note}
                    </ThemedText>
                  )}
                </ThemedView>
              ))}
            </View>
          )}

          {isAdmin && (
            <View style={styles.adminActions}>
              <Link href={`/allenamenti/${training.id}/edit`} asChild>
                <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">Modifica</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="accent">
                  Elimina
                </ThemedText>
              </Pressable>
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
  loader: {
    marginTop: Spacing.six,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.two,
  },
  notes: {
    marginTop: Spacing.two,
    lineHeight: 22,
  },
  exerciseSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  exerciseCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  adminActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
