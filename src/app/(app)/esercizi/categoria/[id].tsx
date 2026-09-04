import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { listExercisesByCategory, type ExerciseWithCategory } from '@/lib/api/exercises';
import { haptic } from '@/hooks/use-haptic';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

type DifficultyFilter = 'tutti' | 'base' | 'intermedio' | 'avanzato';

const DIFFICULTY_LABELS: { value: DifficultyFilter; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'base', label: 'Base' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
];

export default function CategoriaScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const { isAdmin, currentTeam } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [exercises, setExercises] = useState<ExerciseWithCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('tutti');

  useEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    }
  }, [title, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      listExercisesByCategory(id, currentTeam?.id)
        .then((data) => {
          if (!cancelled) setExercises(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, [id, currentTeam])
  );

  const filtered =
    exercises === null
      ? null
      : difficulty === 'tutti'
      ? exercises
      : exercises.filter((e) => e.difficulty === difficulty);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {DIFFICULTY_LABELS.map((item) => {
              const selected = difficulty === item.value;
              return (
                <Pressable key={item.value} onPress={() => { haptic('light'); setDifficulty(item.value); }}>
                  <ThemedView
                    style={[styles.chip, selected && { backgroundColor: colors.accent }]}
                    type={selected ? undefined : 'backgroundElement'}>
                    <ThemedText type="small" themeColor={selected ? 'accentText' : 'text'}>
                      {item.label}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {exercises === null && !error && (
          <ActivityIndicator style={styles.loader} color={colors.accent} />
        )}

        {error && (
          <ThemedText type="small" themeColor="accent" style={styles.padding}>
            {error}
          </ThemedText>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filtered !== null && filtered.length === 0 && (
            <EmptyState
              icon="book-outline"
              title="Nessun esercizio"
              subtitle={exercises?.length === 0
                ? isAdmin
                  ? 'Aggiungine uno con il pulsante + in basso.'
                  : 'Nessun esercizio in questa categoria.'
                : 'Nessun esercizio con questo livello di difficoltà.'}
            />
          )}

          {filtered?.map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => router.push(`/esercizi/${exercise.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedView type="card" style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <ThemedText type="smallBold" style={styles.rowTitle}>
                    {exercise.title}
                  </ThemedText>
                  {exercise.difficulty && (
                    <ThemedView type="backgroundElement" style={styles.badge}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                      </ThemedText>
                    </ThemedView>
                  )}
                </View>
                <View style={styles.rowMeta}>
                  {exercise.duration_minutes && (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {exercise.duration_minutes} min
                      </ThemedText>
                    </View>
                  )}
                  {exercise.equipment && (
                    <View style={styles.metaItem}>
                      <Ionicons name="barbell-outline" size={14} color={colors.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {exercise.equipment}
                      </ThemedText>
                    </View>
                  )}
                  {exercise.video_url && (
                    <View style={styles.metaItem}>
                      <Ionicons name="play-circle-outline" size={14} color={colors.accent} />
                      <ThemedText type="small" themeColor="accent">
                        Video
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ThemedView>
            </Pressable>
          ))}
        </ScrollView>

        {isAdmin && (
          <Pressable
            onPress={() => router.push({ pathname: '/esercizi/new', params: { categoryId: id } })}
            style={({ pressed }) => [styles.fab, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
            <Ionicons name="add" size={24} color={colors.accentText} />
          </Pressable>
        )}
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
  filterRow: {
    paddingTop: Spacing.three,
  },
  filterScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    flexDirection: 'row',
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
    gap: Spacing.two,
  },
  row: {},
  rowCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowTitle: {
    flex: 1,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    borderRadius: Radius.pill,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
