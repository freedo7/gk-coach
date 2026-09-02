import { useFocusEffect } from '@react-navigation/native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { deleteTraining, getTraining, type TrainingWithExercises } from '@/lib/api/trainings';
import { generateTrainingPdf } from '@/lib/pdf';
import { formatDateLong, formatTime } from '@/lib/format';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function AllenamentoDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [training, setTraining] = useState<TrainingWithExercises | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTraining(id)
        .then((data) => {
          if (!cancelled) setTraining(data);
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
    Alert.alert('Eliminare l\'allenamento?', training?.title, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteTraining(id);
          router.back();
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

  if (!training) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      </ThemedView>
    );
  }

  const time = formatTime(training.training_time);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => isAdmin && setShowActions((v) => !v)}>
          <ThemedView type="card" style={styles.headerCard}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.dateText}>
              {formatDateLong(training.training_date)}
              {time ? ` · ${time}` : ''}
            </ThemedText>
            <ThemedText type="default" style={styles.titleText}>{training.title}</ThemedText>
            {training.notes && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.notes}>
                {training.notes}
              </ThemedText>
            )}
          </ThemedView>
          </Pressable>

          {isAdmin && showActions && (
            <View style={styles.adminActions}>
              <Link href={`/allenamenti/${training.id}/edit`} asChild>
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
            </View>
          )}

          {training.training_exercises.length > 0 && (
            <View style={styles.exerciseSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ESERCIZI
              </ThemedText>
              {training.training_exercises.map((te) => (
                <ThemedView key={te.id} type="card" style={styles.exerciseCard}>
                  <ThemedText type="smallBold">{te.exercise.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {te.exercise.description}
                  </ThemedText>
                  {te.exercise.video_url && (
                    <Pressable onPress={() => Linking.openURL(te.exercise.video_url!)}>
                      <ThemedText type="small" themeColor="accent">
                        ▶ Guarda il video
                      </ThemedText>
                    </Pressable>
                  )}
                  {te.note && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Nota: {te.note}
                    </ThemedText>
                  )}
                </ThemedView>
              ))}
            </View>
          )}

          {/* Esporta PDF */}
          <Pressable
            onPress={async () => {
              setExporting(true);
              try {
                const uri = await generateTrainingPdf(training);
                await Share.share({ url: uri, title: `${training.title}.pdf` });
              } catch {
                Alert.alert('Errore', 'Impossibile generare il PDF.');
              }
              setExporting(false);
            }}
            disabled={exporting}
            style={({ pressed }) => [styles.pdfButton, pressed && styles.pressed, exporting && { opacity: 0.5 }]}>
            {exporting ? (
              <ActivityIndicator color={Colors.light.accent} />
            ) : (
              <>
                <Ionicons name="document-outline" size={18} color={Colors.light.accent} />
                <ThemedText type="smallBold" style={{ color: Colors.light.accent }}>Esporta PDF</ThemedText>
              </>
            )}
          </Pressable>

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
    gap: Spacing.two,
  },
  headerCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  dateText: {
    fontWeight: '500',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  notes: {
    lineHeight: 20,
  },
  exerciseSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  exerciseCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  adminActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
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
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    backgroundColor: Colors.light.accentSoft,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
