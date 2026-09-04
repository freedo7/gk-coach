import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/date-field';
import { GoalkeeperPicker } from '@/components/goalkeeper-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listExercises, type ExerciseWithCategory } from '@/lib/api/exercises';
import type { TrainingInput } from '@/lib/api/trainings';
import { haptic } from '@/hooks/use-haptic';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<TrainingInput>;
  initialExerciseIds?: string[];
  submitLabel: string;
  onSubmit: (input: TrainingInput, exerciseIds: string[]) => Promise<void>;
}

export function TrainingForm({ initial, initialExerciseIds, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [goalkeeperId, setGoalkeeperId] = useState<string | null>(initial?.goalkeeper_id ?? null);
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
    haptic('medium');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(
        {
          goalkeeper_id: goalkeeperId,
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
        {t('trainingForm.goalkeeper')}
      </ThemedText>
      <GoalkeeperPicker value={goalkeeperId} onChange={setGoalkeeperId} />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('trainingForm.titleLabel')}
      </ThemedText>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('trainingForm.titlePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('trainingForm.date')}
      </ThemedText>
      <ThemedView style={styles.spacingSmall}>
        <DateField value={date} onChange={setDate} />
      </ThemedView>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('trainingForm.time')}
      </ThemedText>
      <TextInput
        value={time ?? ''}
        onChangeText={setTime}
        placeholder={t('trainingForm.timePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('trainingForm.notes')}
      </ThemedText>
      <TextInput
        value={notes ?? ''}
        onChangeText={setNotes}
        placeholder={t('trainingForm.notesPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
        style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('trainingForm.exercisesLabel')}
      </ThemedText>
      {exercises === null ? (
        <ActivityIndicator color={colors.accent} style={styles.spacing} />
      ) : exercises.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.spacingSmall}>
          {t('trainingForm.noExercises')}
        </ThemedText>
      ) : (
        <View style={styles.exerciseList}>
          {exercises.map((exercise) => {
            const selected = selectedIds.includes(exercise.id);
            return (
              <Pressable key={exercise.id} onPress={() => { haptic('light'); toggleExercise(exercise.id); }}>
                <ThemedView
                  type={selected ? undefined : 'backgroundElement'}
                  style={[styles.exerciseRow, selected && { backgroundColor: colors.accent }]}>
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
          { backgroundColor: colors.accent },
          (!valid || submitting) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}>
        {submitting ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <ThemedText type="smallBold" style={{ color: colors.accentText }}>
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
  exerciseRowText: {
    gap: 2,
    flexShrink: 1,
  },
  button: {
    marginTop: Spacing.five,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
