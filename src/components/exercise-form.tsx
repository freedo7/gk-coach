import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FadeIn } from '@/components/fade-in';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listCategories } from '@/lib/api/categories';
import type { ExerciseInput } from '@/lib/api/exercises';
import type { ExerciseCategory } from '@/types/database';
import { haptic } from '@/hooks/use-haptic';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<ExerciseInput>;
  submitLabel: string;
  onSubmit: (input: ExerciseInput) => Promise<void>;
}

export function ExerciseForm({ initial, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const isEdit = !!initial?.title;
  const [categories, setCategories] = useState<ExerciseCategory[] | null>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '');
  const [contentUrl, setContentUrl] = useState(initial?.content_url ?? '');
  const [difficulty, setDifficulty] = useState<'base' | 'intermedio' | 'avanzato' | null>(initial?.difficulty ?? null);
  const [durationMinutes, setDurationMinutes] = useState(initial?.duration_minutes?.toString() ?? '');
  const [equipment, setEquipment] = useState(initial?.equipment ?? '');
  const [sets, setSets] = useState(initial?.sets?.toString() ?? '');
  const [reps, setReps] = useState(initial?.reps?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCategories().then((data) => {
      setCategories(data);
      if (!categoryId && data.length > 0) setCategoryId(data[0].id);
    });
  }, []);

  // Progressive reveal: step 1 always visible, others appear progressively
  const showStep2 = isEdit || (title.trim().length > 0 && categoryId.length > 0);
  const showStep3 = isEdit || (showStep2 && (difficulty !== null || durationMinutes.trim().length > 0 || sets.trim().length > 0 || reps.trim().length > 0));
  const showStep4 = isEdit || (showStep3 && description.trim().length > 0);

  // Track which steps have already appeared (to avoid re-animating)
  const [revealed, setRevealed] = useState({ step2: isEdit, step3: isEdit, step4: isEdit });
  useEffect(() => {
    if (showStep2 && !revealed.step2) setRevealed((r) => ({ ...r, step2: true }));
  }, [showStep2]);
  useEffect(() => {
    if (showStep3 && !revealed.step3) setRevealed((r) => ({ ...r, step3: true }));
  }, [showStep3]);
  useEffect(() => {
    if (showStep4 && !revealed.step4) setRevealed((r) => ({ ...r, step4: true }));
  }, [showStep4]);

  const valid = title.trim().length > 0 && description.trim().length > 0 && categoryId.length > 0;

  // Step indicator
  const currentStep = useMemo(() => {
    if (!showStep2) return 1;
    if (!showStep3) return 2;
    if (!showStep4) return 3;
    return 4;
  }, [showStep2, showStep3, showStep4]);

  async function handleSubmit() {
    haptic('medium');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        video_url: videoUrl.trim() || null,
        content_url: contentUrl.trim() || null,
        difficulty,
        duration_minutes: durationMinutes.trim() ? parseInt(durationMinutes.trim(), 10) : null,
        equipment: equipment.trim() || null,
        sets: sets.trim() ? parseInt(sets.trim(), 10) : null,
        reps: reps.trim() ? parseInt(reps.trim(), 10) : null,
      });
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
          {[1, 2, 3, 4].map((s) => (
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

      {/* STEP 1: Titolo + Categoria */}
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('exerciseForm.titleLabel')}
      </ThemedText>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('exerciseForm.titlePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('exerciseForm.category')}
      </ThemedText>
      {categories === null ? (
        <ActivityIndicator color={colors.accent} style={styles.spacing} />
      ) : (
        <ThemedView style={styles.chipRow}>
          {categories.map((category) => {
            const selected = category.id === categoryId;
            return (
              <Pressable key={category.id} onPress={() => { haptic('light'); setCategoryId(category.id); }}>
                <ThemedView
                  style={[styles.chip, selected && { backgroundColor: colors.accent }]}
                  type={selected ? undefined : 'backgroundElement'}>
                  <ThemedText type="small" themeColor={selected ? 'accentText' : 'text'}>
                    {category.name}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ThemedView>
      )}

      {/* STEP 2: Difficoltà + Durata + Serie/Reps */}
      {revealed.step2 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('exerciseForm.difficulty')}
            </ThemedText>
            <ThemedView style={styles.chipRow}>
              {(['base', 'intermedio', 'avanzato'] as const).map((level) => {
                const selected = difficulty === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => { haptic('light'); setDifficulty(selected ? null : level); }}>
                    <ThemedView
                      style={[styles.chip, selected && { backgroundColor: colors.accent }]}
                      type={selected ? undefined : 'backgroundElement'}>
                      <ThemedText type="small" themeColor={selected ? 'accentText' : 'text'}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </ThemedView>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('exerciseForm.duration')}
            </ThemedText>
            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder={t('exerciseForm.durationPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('exerciseForm.setsReps')}
            </ThemedText>
            <ThemedView style={styles.setsRow}>
              <TextInput
                value={sets}
                onChangeText={setSets}
                placeholder={t('exerciseForm.setsPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                style={[styles.input, styles.setsInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />
              <ThemedText style={[styles.setsSeparator, { color: colors.textSecondary }]}>×</ThemedText>
              <TextInput
                value={reps}
                onChangeText={setReps}
                placeholder={t('exerciseForm.repsPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                style={[styles.input, styles.setsInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />
            </ThemedView>

            {/* Link "Salta" per andare avanti senza compilare */}
            {!showStep3 && !isEdit && (
              <Pressable
                onPress={() => setRevealed((r) => ({ ...r, step3: true }))}
                style={styles.skipBtn}>
                <ThemedText type="small" themeColor="accent">{t('exerciseForm.skip')}</ThemedText>
              </Pressable>
            )}
          </View>
        </FadeIn>
      )}

      {/* STEP 3: Equipaggiamento + Istruzioni */}
      {revealed.step3 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('exerciseForm.equipment')}
            </ThemedText>
            <TextInput
              value={equipment}
              onChangeText={setEquipment}
              placeholder={t('exerciseForm.equipmentPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('exerciseForm.instructions')}
            </ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('exerciseForm.instructionsPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />
          </View>
        </FadeIn>
      )}

      {/* STEP 4: Video + Contenuto URL */}
      {revealed.step4 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('exerciseForm.videoUrl')}
            </ThemedText>
            <TextInput
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/..."
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('exerciseForm.contentUrl')}
            </ThemedText>
            <TextInput
              value={contentUrl}
              onChangeText={setContentUrl}
              placeholder="https://...supabase.co/storage/..."
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />
          </View>
        </FadeIn>
      )}

      {error && (
        <ThemedText type="small" themeColor="accent" style={styles.spacing}>
          {error}
        </ThemedText>
      )}

      {revealed.step3 && (
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  spacing: {
    marginTop: Spacing.four,
  },
  setsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  setsInput: {
    flex: 1,
    marginTop: 0,
  },
  setsSeparator: {
    fontSize: 20,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
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
