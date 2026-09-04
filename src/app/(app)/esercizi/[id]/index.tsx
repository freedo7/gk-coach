import { Link, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlan } from '@/hooks/use-plan';
import { deleteExercise, getExercise, type ExerciseWithCategory } from '@/lib/api/exercises';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

export default function EsercizioDettaglioScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const colors = useTheme();
  const { canViewVideo, canViewRichContent } = usePlan();
  const { show: showToast } = useToast();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseWithCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getExercise(id)
        .then((data) => {
          if (!cancelled) setExercise(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function handleDelete() {
    haptic('warning');
    Alert.alert(t('exercises.deleteExerciseConfirm'), exercise?.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          showToast(t('exercises.exerciseDeleted'));
          router.back();
          deleteExercise(id).catch(() => showToast(t('exercises.deleteError'), 'error'));
        },
      },
    ]);
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="accent">{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!exercise) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.badge}>
            <ThemedText type="small" themeColor="textSecondary">
              {exercise.category.name}
            </ThemedText>
          </ThemedView>

          <ThemedText type="title">{exercise.title}</ThemedText>
          {(exercise.sets || exercise.reps) && (
            <ThemedText type="smallBold" themeColor="accent">
              {[exercise.sets && `${exercise.sets} serie`, exercise.reps && `${exercise.reps} ripetizioni`]
                .filter(Boolean)
                .join(' × ')}
            </ThemedText>
          )}

          <ThemedText style={styles.description}>{exercise.description}</ThemedText>

          {exercise.video_url && (
            canViewVideo ? (
              <Pressable
                onPress={() => Linking.openURL(exercise.video_url!)}
                style={({ pressed }) => [styles.actionLink, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={{ color: colors.accent }}>
                  {t('exercises.watchVideo')}
                </ThemedText>
              </Pressable>
            ) : (
              <UpgradeBanner message={t('exercises.videoProOnly')} />
            )
          )}

          {exercise.content_url && (
            canViewRichContent ? (
              <Pressable
                onPress={() => router.push({ pathname: '/esercizi/scheda', params: { url: exercise.content_url! } })}
                style={({ pressed }) => [styles.actionLink, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={{ color: colors.accent }}>
                  {t('exercises.openSheet')}
                </ThemedText>
              </Pressable>
            ) : (
              <UpgradeBanner message={t('exercises.sheetProOnly')} />
            )
          )}

          {isAdmin && (
            <ThemedView style={styles.adminActions}>
              <Link href={`/esercizi/${exercise.id}/edit`} asChild>
                <Pressable style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
                  <Ionicons name="pencil-outline" size={18} color={colors.text} />
                  <ThemedText type="smallBold">{t('common.edit')}</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.dangerSoft }, pressed && styles.pressed]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <ThemedText type="smallBold" style={{ color: colors.danger }}>{t('common.delete')}</ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ScrollView>
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
  loader: {
    marginTop: Spacing.six,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  description: {
    lineHeight: 22,
  },
  actionLink: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  adminActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
