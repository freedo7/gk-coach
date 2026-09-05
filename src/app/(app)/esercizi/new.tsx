import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ExerciseForm } from '@/components/exercise-form';
import { FieldBuilder } from '@/components/field-builder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { usePlan } from '@/hooks/use-plan';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { createExercise } from '@/lib/api/exercises';
import { Radius, Spacing, BottomTabInset } from '@/constants/theme';
import type { FieldElement } from '@/types/database';

type Mode = 'choose' | 'builder' | 'classic';

export default function NuovoEsercizioScreen() {
  const { t } = useTranslation();
  const { isAdmin, session, currentTeam } = useAuth();
  const { canAddContent } = usePlan();
  const router = useRouter();
  const colors = useTheme();
  const [mode, setMode] = useState<Mode>('choose');
  const [builderLayout, setBuilderLayout] = useState<FieldElement[] | null>(null);

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/esercizi" />;
  if (!canAddContent) return <Redirect href="/profilo/paywall" />;

  const handleBuilderDone = useCallback((layout: FieldElement[]) => {
    setBuilderLayout(layout);
    setMode('classic');
  }, []);

  // Schermata di scelta
  if (mode === 'choose') {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.chooseContent}>
          <ThemedText type="title" style={styles.chooseTitle}>{t('exerciseMode.title')}</ThemedText>

          <Pressable
            onPress={() => { haptic('light'); setMode('builder'); }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <ThemedView type="card" style={styles.modeCard}>
              <View style={[styles.modeIcon, { backgroundColor: '#2D7A30' }]}>
                <Ionicons name="grid-outline" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.modeTextWrap}>
                <ThemedText type="smallBold">{t('exerciseMode.builder')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('exerciseMode.builderDesc')}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </ThemedView>
          </Pressable>

          <Pressable
            onPress={() => { haptic('light'); setMode('classic'); }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <ThemedView type="card" style={styles.modeCard}>
              <View style={[styles.modeIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="create-outline" size={28} color={colors.accentText} />
              </View>
              <View style={styles.modeTextWrap}>
                <ThemedText type="smallBold">{t('exerciseMode.classic')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('exerciseMode.classicDesc')}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </ThemedView>
          </Pressable>
        </ScrollView>
      </ThemedView>
    );
  }

  // Builder
  if (mode === 'builder') {
    return (
      <ThemedView style={styles.container}>
        <FieldBuilder initialLayout={builderLayout ?? undefined} onDone={handleBuilderDone} />
      </ThemedView>
    );
  }

  // Form classico (con eventuale layout dal builder)
  return (
    <ThemedView style={styles.container}>
      <ExerciseForm
        initialLayout={builderLayout}
        submitLabel={t('exercises.createExercise')}
        onSubmit={async (input) => {
          await createExercise(input, session.user.id, currentTeam.id);
          router.back();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chooseContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  chooseTitle: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextWrap: {
    flex: 1,
    gap: Spacing.half,
  },
  builderScroll: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
