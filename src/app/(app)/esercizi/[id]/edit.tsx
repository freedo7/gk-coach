import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ExerciseForm } from '@/components/exercise-form';
import { FieldBuilder } from '@/components/field-builder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { getExercise, updateExercise, type ExerciseWithCategory } from '@/lib/api/exercises';
import { Radius, Spacing } from '@/constants/theme';
import type { FieldElement } from '@/types/database';

type Mode = 'form' | 'builder';

export default function ModificaEsercizioScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseWithCategory | null>(null);
  const [mode, setMode] = useState<Mode>('form');
  const [builderLayout, setBuilderLayout] = useState<FieldElement[] | null>(null);

  useEffect(() => {
    getExercise(id).then((ex) => {
      setExercise(ex);
      if (ex.layout?.length) setBuilderLayout(ex.layout);
    });
  }, [id]);

  if (!isAdmin) return <Redirect href="/esercizi" />;

  if (!exercise) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={{ marginTop: Spacing.six }} color={colors.accent} />
      </ThemedView>
    );
  }

  const handleBuilderDone = useCallback((layout: FieldElement[]) => {
    setBuilderLayout(layout);
    setMode('form');
  }, []);

  if (mode === 'builder') {
    return (
      <ThemedView style={styles.container}>
        <FieldBuilder initialLayout={builderLayout ?? undefined} onDone={handleBuilderDone} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Button to open/edit field layout */}
      {exercise.layout?.length || builderLayout ? (
        <Pressable
          onPress={() => { haptic('light'); setMode('builder'); }}
          style={({ pressed }) => [styles.editFieldBtn, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="football-outline" size={18} color={colors.accent} />
          <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('exercises.editField')}</ThemedText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => { haptic('light'); setMode('builder'); }}
          style={({ pressed }) => [styles.editFieldBtn, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add-outline" size={18} color={colors.accent} />
          <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('exercises.addField')}</ThemedText>
        </Pressable>
      )}

      <ExerciseForm
        initial={exercise}
        initialLayout={builderLayout}
        submitLabel={t('exercises.saveChanges')}
        onSubmit={async (input) => {
          await updateExercise(id, input);
          router.back();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  editFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.control,
  },
});
