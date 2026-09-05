import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/date-field';
import { FadeIn } from '@/components/fade-in';
import { GoalkeeperPicker } from '@/components/goalkeeper-picker';
import { TimeField } from '@/components/time-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listExercises, type ExerciseWithCategory } from '@/lib/api/exercises';
import { listCategories } from '@/lib/api/categories';
import { getLatestTraining, type TrainingInput } from '@/lib/api/trainings';
import { useAuth } from '@/context/auth-context';
import type { ExerciseCategory } from '@/types/database';
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
  const { currentTeam } = useAuth();
  const isEdit = !!initial?.title;
  const [goalkeeperId, setGoalkeeperId] = useState<string | null>(initial?.goalkeeper_id ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState<string | null>(initial?.training_date ?? null);
  const [time, setTime] = useState(initial?.training_time ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [exercises, setExercises] = useState<ExerciseWithCategory[] | null>(null);
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialExerciseIds ?? []);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listExercises().then(setExercises);
    listCategories().then(setCategories);
    // Smart defaults: precompila dall'ultimo allenamento creato
    if (!isEdit && !initial && currentTeam) {
      getLatestTraining(currentTeam.id).then((latest) => {
        if (!latest) return;
        if (latest.training_time && !time) setTime(latest.training_time);
        if (latest.goalkeeper_id && !goalkeeperId) setGoalkeeperId(latest.goalkeeper_id);
        if (latest.title && !title) setTitle(latest.title);
      }).catch(() => {});
    }
  }, []);

  // Progressive reveal
  const showStep2 = isEdit || (title.trim().length > 0 && !!date);
  const showStep3 = isEdit || showStep2;

  const [revealed, setRevealed] = useState({ step2: isEdit, step3: isEdit });
  useEffect(() => {
    if (showStep2 && !revealed.step2) setRevealed((r) => ({ ...r, step2: true }));
  }, [showStep2]);
  useEffect(() => {
    if (showStep3 && !revealed.step3) setRevealed((r) => ({ ...r, step3: true }));
  }, [showStep3]);

  const valid = title.trim().length > 0 && !!date && !!time;

  const currentStep = useMemo(() => {
    if (!showStep2) return 1;
    if (!showStep3) return 2;
    return 3;
  }, [showStep2, showStep3]);

  // Filtered exercises for picker
  const filteredExercises = useMemo(() => {
    if (!exercises) return null;
    let list = exercises;
    const q = exerciseQuery.trim().toLowerCase();
    if (q) list = list.filter((e) => e.title.toLowerCase().includes(q));
    if (categoryFilter) list = list.filter((e) => e.category_id === categoryFilter);
    return list;
  }, [exercises, exerciseQuery, categoryFilter]);

  // Selected exercises in order
  const selectedExercises = useMemo(() => {
    if (!exercises) return [];
    return selectedIds.map((id) => exercises.find((e) => e.id === id)).filter(Boolean) as ExerciseWithCategory[];
  }, [exercises, selectedIds]);

  function toggleExercise(id: string) {
    haptic('light');
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
      {/* Step indicator (solo in creazione) */}
      {!isEdit && (
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                { backgroundColor: s <= currentStep ? colors.accent : colors.backgroundElement },
              ]}
            />
          ))}
        </View>
      )}

      {/* STEP 1: Titolo + Data + Ora */}
      <ThemedText type="smallBold" themeColor="textSecondary">
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
      <TimeField
        value={time || null}
        onChange={(v) => setTime(v ?? '')}
        placeholder={t('trainingForm.timePlaceholder')}
      />

      {/* STEP 2: Portiere + Note */}
      {revealed.step2 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('trainingForm.goalkeeper')}
            </ThemedText>
            <GoalkeeperPicker value={goalkeeperId} onChange={setGoalkeeperId} />

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
          </View>
        </FadeIn>
      )}

      {/* STEP 3: Selezione esercizi */}
      {revealed.step3 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('trainingForm.exercisesLabel')}
            </ThemedText>

            {/* Esercizi selezionati (riepilogo) */}
            {selectedExercises.length > 0 && (
              <View style={styles.selectedList}>
                {selectedExercises.map((exercise, index) => (
                  <View key={exercise.id} style={[styles.selectedChip, { backgroundColor: colors.accentSoft }]}>
                    <ThemedText type="small" style={[styles.selectedIndex, { color: colors.accent }]}>
                      {index + 1}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.accent, flex: 1 }}>
                      {exercise.title}
                    </ThemedText>
                    <Pressable onPress={() => toggleExercise(exercise.id)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.accent} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Ricerca esercizi */}
            <ThemedView type="backgroundElement" style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                value={exerciseQuery}
                onChangeText={setExerciseQuery}
                placeholder={t('trainingForm.searchExercises')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
                clearButtonMode="while-editing"
              />
            </ThemedView>

            {/* Filtro per categoria */}
            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
                <Pressable onPress={() => { haptic('light'); setCategoryFilter(null); }}>
                  <ThemedView
                    type={categoryFilter === null ? undefined : 'backgroundElement'}
                    style={[styles.catChip, categoryFilter === null && { backgroundColor: colors.accent }]}>
                    <ThemedText type="small" style={{ color: categoryFilter === null ? colors.accentText : colors.textSecondary, fontWeight: '600' }}>
                      {t('common.all')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
                {categories.map((cat) => {
                  const sel = categoryFilter === cat.id;
                  return (
                    <Pressable key={cat.id} onPress={() => { haptic('light'); setCategoryFilter(sel ? null : cat.id); }}>
                      <ThemedView
                        type={sel ? undefined : 'backgroundElement'}
                        style={[styles.catChip, sel && { backgroundColor: colors.accent }]}>
                        <ThemedText type="small" style={{ color: sel ? colors.accentText : colors.text, fontWeight: '600' }}>
                          {cat.name}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Lista esercizi */}
            {filteredExercises === null ? (
              <ActivityIndicator color={colors.accent} style={styles.spacing} />
            ) : filteredExercises.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.spacingSmall}>
                {exercises?.length === 0 ? t('trainingForm.noExercises') : t('common.noResults')}
              </ThemedText>
            ) : (
              <View style={styles.exerciseList}>
                {filteredExercises.map((exercise) => {
                  const selected = selectedIds.includes(exercise.id);
                  return (
                    <Pressable key={exercise.id} onPress={() => toggleExercise(exercise.id)}>
                      <ThemedView
                        type={selected ? undefined : 'backgroundElement'}
                        style={[styles.exerciseRow, selected && { backgroundColor: colors.accent }]}>
                        <View style={styles.exerciseRowText}>
                          <ThemedText type="smallBold" themeColor={selected ? 'accentText' : 'text'}>
                            {exercise.title}
                          </ThemedText>
                          <ThemedText type="small" themeColor={selected ? 'accentText' : 'textSecondary'}>
                            {exercise.category.name}
                          </ThemedText>
                        </View>
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                          size={22}
                          color={selected ? colors.accentText : colors.textSecondary}
                        />
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </FadeIn>
      )}

      {error && (
        <ThemedText type="small" themeColor="accent" style={styles.spacing}>
          {error}
        </ThemedText>
      )}

      {revealed.step2 && (
        <FadeIn delay={isEdit ? 0 : 100}>
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
        </FadeIn>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepSection: {
    marginTop: Spacing.two,
  },
  stepDivider: {
    height: 1,
    marginBottom: Spacing.four,
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
  selectedList: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  selectedIndex: {
    fontWeight: '700',
    fontSize: 12,
    width: 18,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  catChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
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
