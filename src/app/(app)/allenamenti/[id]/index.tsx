import { Link, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteTraining, getTraining, type TrainingWithExercises } from '@/lib/api/trainings';
import { generateTrainingPdf } from '@/lib/pdf';
import { formatDateLong, formatTime } from '@/lib/format';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

export default function AllenamentoDettaglioScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const colors = useTheme();
  const { show: showToast } = useToast();
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
    haptic('warning');
    Alert.alert(t('trainings.deleteTrainingConfirm'), training?.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          showToast(t('trainings.trainingDeleted'));
          router.back();
          deleteTraining(id).catch(() => showToast(t('trainings.deleteError'), 'error'));
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
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      </ThemedView>
    );
  }

  const time = formatTime(training.training_time);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => isAdmin && setShowActions((v) => !v)}>
          <ThemedView type="card" style={[styles.headerCard, { borderColor: colors.accent }]}>
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
                <Pressable style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
                  <Ionicons name="pencil-outline" size={18} color={colors.text} />
                  <ThemedText type="smallBold">{t('common.edit')}</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                onPress={() => {
                  haptic('light');
                  const exerciseIds = training.training_exercises.map((te) => te.exercise_id).join(',');
                  router.push(`/allenamenti/new?duplicate=1&title=${encodeURIComponent(training.title)}&notes=${encodeURIComponent(training.notes ?? '')}&time=${encodeURIComponent(training.training_time ?? '')}&goalkeeper_id=${training.goalkeeper_id ?? ''}&exercises=${exerciseIds}` as any);
                }}
                style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
                <Ionicons name="copy-outline" size={18} color={colors.accent} />
                <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('common.duplicate')}</ThemedText>
              </Pressable>
            </View>
          )}
          {isAdmin && showActions && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.dangerSoft }, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <ThemedText type="smallBold" style={{ color: colors.danger }}>{t('common.delete')}</ThemedText>
            </Pressable>
          )}

          {training.training_exercises.length > 0 && (
            <View style={styles.exerciseSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('trainings.exercises')}
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
                        {t('trainings.watchVideo')}
                      </ThemedText>
                    </Pressable>
                  )}
                  {te.note && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('trainings.notePrefix')}{te.note}
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
                Alert.alert(t('common.error'), t('trainings.pdfError'));
              }
              setExporting(false);
            }}
            disabled={exporting}
            style={({ pressed }) => [styles.pdfButton, { backgroundColor: colors.accentSoft }, pressed && styles.pressed, exporting && { opacity: 0.5 }]}>
            {exporting ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Ionicons name="document-outline" size={18} color={colors.accent} />
                <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('trainings.exportPdf')}</ThemedText>
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
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
