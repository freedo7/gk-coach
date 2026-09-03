import { useFocusEffect } from '@react-navigation/native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { useAuth } from '@/context/auth-context';
import { usePlan } from '@/hooks/use-plan';
import { deleteExercise, getExercise, type ExerciseWithCategory } from '@/lib/api/exercises';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function EsercizioDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
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
    Alert.alert('Eliminare l\'esercizio?', exercise?.title, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          showToast('Esercizio eliminato');
          router.back();
          deleteExercise(id).catch(() => showToast('Errore durante l\'eliminazione', 'error'));
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
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
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
                style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.actionLinkText}>
                  ▶ Guarda il video
                </ThemedText>
              </Pressable>
            ) : (
              <UpgradeBanner message="Video disponibile nel piano Pro" />
            )
          )}

          {exercise.content_url && (
            canViewRichContent ? (
              <Pressable
                onPress={() => router.push({ pathname: '/esercizi/scheda', params: { url: exercise.content_url! } })}
                style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.actionLinkText}>
                  📄 Apri scheda esercizio
                </ThemedText>
              </Pressable>
            ) : (
              <UpgradeBanner message="Scheda PDF disponibile nel piano Pro" />
            )
          )}

          {isAdmin && (
            <ThemedView style={styles.adminActions}>
              <Link href={`/esercizi/${exercise.id}/edit`} asChild>
                <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.light.text} />
                  <ThemedText type="smallBold">Modifica</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, styles.actionButtonDelete, pressed && styles.pressed]}>
                <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
                <ThemedText type="smallBold" style={{ color: Colors.light.danger }}>Elimina</ThemedText>
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
    backgroundColor: Colors.light.accentSoft,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  actionLinkText: {
    color: Colors.light.accent,
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
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  actionButtonDelete: {
    backgroundColor: Colors.light.dangerSoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
