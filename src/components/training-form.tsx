import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listExercises, type ExerciseWithCategory } from '@/lib/api/exercises';
import type { TrainingInput } from '@/lib/api/trainings';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<TrainingInput>;
  initialExerciseIds?: string[];
  submitLabel: string;
  onSubmit: (input: TrainingInput, exerciseIds: string[]) => Promise<void>;
}

export function TrainingForm({ initial, initialExerciseIds, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState<string | null>(initial?.training_date ?? null);
  const [time, setTime] = useState(initial?.training_time ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [exercises, setExercises] = useState<ExerciseWithCategory[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialExerciseIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listExercises().then(setExercises);
  }, []);

  const valid = title.trim().length > 0 && !!date;

  function toggleExercise(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          training_date: date!,
          training_time: time.trim() || null,
          notes: notes.trim() || null,
        },
        selectedIds
      );
    } catch (err) {
      setError((err as any)?.message ?? (err as any)?.error_description ?? JSON.stringify(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Titolo
      </ThemedText>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Es. Seduta portieri"
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Data
      </ThemedText>
      <ThemedView style={styles.spacingSmall}>
        <DateField value={date} onChange={setDate} />
      </ThemedView>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Orario (opzionale)
      </ThemedText>
      <TextInput
        value={time ?? ''}
        onChangeText={setTime}
        placeholder="18:00"
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Note (opzionale)
      </ThemedText>
      <TextInput
        value={notes ?? ''}
        onChangeText={setNotes}
        placeholder="Indicazioni generali sulla seduta..."
        placeholderTextColor={Colors.light.textSecondary}
        multiline
        numberOfLines={3}
        style={[styles.input, styles.multiline]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Esercizi della seduta
      </ThemedText>
      {exercises === null ? (
        <ActivityIndicator color={Colors.light.accent} style={styles.spacing} />
      ) : exercises.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.spacingSmall}>
          Nessun esercizio in libreria ancora.
        </ThemedText>
      ) : (
        <View style={styles.exerciseList}>
          {exercises.map((exercise) => {
            const selected = selectedIds.includes(exercise.id);
            return (
              <Pressable key={exercise.id} onPress={() => toggleExercise(exercise.id)}>
                <ThemedView
                  type={selected ? undefined : 'backgroundElement'}
                  style={[styles.exerciseRow, selected && styles.exerciseRowSelected]}>
                  <View style={styles.exerciseRowText}>
                    <ThemedText type="smallBold" themeColor={selected ? 'accentText' : 'text'}>
                      {exercise.title}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor={selected ? 'accentText' : 'textSecondary'}>
                      {exercise.category.name}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" themeColor={selected ? 'accentText' : 'textSecondary'}>
                    {selected ? '✓' : '+'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </View>
      )}

      {error && (
        <ThemedText type="small" themeColor="accent" style={styles.spacing}>
          {error}
        </ThemedText>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={!valid || submitting}
        style={({ pressed }) => [
          styles.button,
          (!valid || submitting) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}>
        {submitting ? (
          <ActivityIndicator color={Colors.light.accentText} />
        ) : (
          <ThemedText type="smallBold" style={styles.buttonText}>
            {submitLabel}
          </ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  spacing: {
    marginTop: Spacing.four,
  },
  spacingSmall: {
    marginTop: Spacing.two,
  },
  exerciseList: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
  exerciseRow: {
    borderRadius: Radius.control,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseRowSelected: {
    backgroundColor: Colors.light.accent,
  },
  exerciseRowText: {
    gap: 2,
    flexShrink: 1,
  },
  button: {
    marginTop: Spacing.five,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.accentText,
  },
  pressed: {
    opacity: 0.8,
  },
});
