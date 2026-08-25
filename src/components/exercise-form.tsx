import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listCategories } from '@/lib/api/categories';
import type { ExerciseInput } from '@/lib/api/exercises';
import type { ExerciseCategory } from '@/types/database';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<ExerciseInput>;
  submitLabel: string;
  onSubmit: (input: ExerciseInput) => Promise<void>;
}

export function ExerciseForm({ initial, submitLabel, onSubmit }: Props) {
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

  const valid = title.trim().length > 0 && description.trim().length > 0 && categoryId.length > 0;

  async function handleSubmit() {
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
      setError(err instanceof Error ? err.message : String(err));
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
        placeholder="Es. Presa alta in tuffo"
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Categoria
      </ThemedText>
      {categories === null ? (
        <ActivityIndicator color={Colors.light.accent} style={styles.spacing} />
      ) : (
        <ThemedView style={styles.chipRow}>
          {categories.map((category) => {
            const selected = category.id === categoryId;
            return (
              <Pressable key={category.id} onPress={() => setCategoryId(category.id)}>
                <ThemedView
                  style={[styles.chip, selected && styles.chipSelected]}
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

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Difficoltà (opzionale)
      </ThemedText>
      <ThemedView style={styles.chipRow}>
        {(['base', 'intermedio', 'avanzato'] as const).map((level) => {
          const selected = difficulty === level;
          return (
            <Pressable
              key={level}
              onPress={() => setDifficulty(selected ? null : level)}>
              <ThemedView
                style={[styles.chip, selected && styles.chipSelected]}
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
        Durata in minuti (opzionale)
      </ThemedText>
      <TextInput
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        placeholder="Es. 15"
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="number-pad"
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Serie e ripetizioni (opzionale)
      </ThemedText>
      <ThemedView style={styles.setsRow}>
        <TextInput
          value={sets}
          onChangeText={setSets}
          placeholder="Serie"
          placeholderTextColor={Colors.light.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, styles.setsInput]}
        />
        <ThemedText style={styles.setsSeparator}>×</ThemedText>
        <TextInput
          value={reps}
          onChangeText={setReps}
          placeholder="Ripetizioni"
          placeholderTextColor={Colors.light.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, styles.setsInput]}
        />
      </ThemedView>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Attrezzatura (opzionale)
      </ThemedText>
      <TextInput
        value={equipment}
        onChangeText={setEquipment}
        placeholder="Es. Pallone, coni, ostacoli"
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Istruzioni
      </ThemedText>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Descrivi l'esercizio, i passaggi, le variabili..."
        placeholderTextColor={Colors.light.textSecondary}
        multiline
        numberOfLines={6}
        style={[styles.input, styles.multiline]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Link video (opzionale)
      </ThemedText>
      <TextInput
        value={videoUrl}
        onChangeText={setVideoUrl}
        placeholder="https://youtube.com/..."
        placeholderTextColor={Colors.light.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        URL scheda HTML (opzionale)
      </ThemedText>
      <TextInput
        value={contentUrl}
        onChangeText={setContentUrl}
        placeholder="https://...supabase.co/storage/..."
        placeholderTextColor={Colors.light.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
        style={styles.input}
      />

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
    color: Colors.light.textSecondary,
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
  chipSelected: {
    backgroundColor: Colors.light.accent,
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
