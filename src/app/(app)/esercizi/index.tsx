import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { listExercises, type ExerciseWithCategory } from '@/lib/api/exercises';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function EserciziScreen() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseWithCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listExercises()
        .then((data) => {
          if (!cancelled) setExercises(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const grouped = groupByCategory(exercises ?? []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {exercises === null && !error && (
          <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
        )}
        {error && (
          <ThemedText type="small" themeColor="accent" style={styles.padding}>
            {error}
          </ThemedText>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {exercises !== null && exercises.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.padding}>
              Nessun esercizio ancora. {isAdmin ? 'Aggiungine uno con il pulsante qui sotto.' : ''}
            </ThemedText>
          )}

          {grouped.map(([category, items]) => (
            <View key={category.id} style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {category.name.toUpperCase()}
              </ThemedText>
              {items.map((exercise) => (
                <Link key={exercise.id} href={`/esercizi/${exercise.id}`} asChild>
                  <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <ThemedView type="card" style={styles.rowCard}>
                      <ThemedText type="smallBold">{exercise.title}</ThemedText>
                      {exercise.video_url && (
                        <ThemedText type="small" themeColor="accent">
                          Video incluso
                        </ThemedText>
                      )}
                    </ThemedView>
                  </Pressable>
                </Link>
              ))}
            </View>
          ))}
        </ScrollView>

        {isAdmin && (
          <Pressable
            onPress={() => router.push('/esercizi/new')}
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.fabText}>
              + Nuovo esercizio
            </ThemedText>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function groupByCategory(exercises: ExerciseWithCategory[]) {
  const map = new Map<string, { category: ExerciseWithCategory['category']; items: ExerciseWithCategory[] }>();
  for (const exercise of exercises) {
    const key = exercise.category.id;
    if (!map.has(key)) map.set(key, { category: exercise.category, items: [] });
    map.get(key)!.items.push(exercise);
  }
  return Array.from(map.values())
    .sort((a, b) => a.category.sort_order - b.category.sort_order)
    .map((entry) => [entry.category, entry.items] as const);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loader: {
    marginTop: Spacing.five,
  },
  padding: {
    padding: Spacing.four,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  row: {
    marginBottom: Spacing.one,
  },
  rowCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  fabText: {
    color: Colors.light.accentText,
  },
});
