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
          {/* Builder card — highlighted */}
          <Pressable
            onPress={() => { haptic('light'); setMode('builder'); }}
            style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
            <View style={styles.builderCard}>
              <View style={styles.builderCardHeader}>
                <View style={styles.builderIcon}>
                  <Ionicons name="football-outline" size={30} color="#FFF" />
                </View>
                <View style={styles.builderTag}>
                  <Ionicons name="star" size={10} color="#FFD60A" />
                  <ThemedText style={styles.builderTagText}>{t('exerciseMode.builderTag')}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.builderTitle}>{t('exerciseMode.builder')}</ThemedText>
              <ThemedText style={styles.builderDesc}>{t('exerciseMode.builderDesc')}</ThemedText>
              <View style={styles.builderCta}>
                <ThemedText style={styles.builderCtaText}>{t('exercises.createExercise')}</ThemedText>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </View>
            </View>
          </Pressable>

          {/* Classic card — subtle */}
          <Pressable
            onPress={() => { haptic('light'); setMode('classic'); }}
            style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
            <ThemedView type="card" style={styles.classicCard}>
              <View style={[styles.classicIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.accentText} />
              </View>
              <View style={styles.classicTextWrap}>
                <ThemedText type="smallBold">{t('exerciseMode.classic')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('exerciseMode.classicDesc')}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
  // Builder card — big & prominent
  builderCard: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
    backgroundColor: '#1B5E20',
    overflow: 'hidden',
  },
  builderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  builderIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  builderTagText: {
    color: '#FFD60A',
    fontSize: 11,
    fontWeight: '700',
  },
  builderTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  builderDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
  },
  builderCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: Spacing.two,
  },
  builderCtaText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Classic card — compact
  classicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  classicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicTextWrap: {
    flex: 1,
    gap: Spacing.half,
  },
  builderScroll: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
