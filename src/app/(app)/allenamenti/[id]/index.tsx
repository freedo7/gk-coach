import { Link, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Ionicons } from '@expo/vector-icons';
import { FadeIn } from '@/components/fade-in';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteTraining, getTraining, listComments, addComment, deleteComment, type TrainingWithExercises } from '@/lib/api/trainings';
import { sendPushToCoach } from '@/lib/api/push';
import { generateTrainingPdf } from '@/lib/pdf';
import { formatDateLong, formatTime } from '@/lib/format';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import type { TrainingComment } from '@/types/database';

export default function AllenamentoDettaglioScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin, session, profile, currentTeam } = useAuth();
  const colors = useTheme();
  const { show: showToast } = useToast();
  const router = useRouter();
  const [training, setTraining] = useState<TrainingWithExercises | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [comments, setComments] = useState<TrainingComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

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
      listComments(id)
        .then((data) => {
          if (!cancelled) setComments(data);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  async function handleSendComment() {
    const text = commentText.trim();
    if (!text || !session) return;
    setSendingComment(true);
    try {
      const comment = await addComment(id, session.user.id, text);
      setComments((prev) => [...prev, comment]);
      setCommentText('');
      haptic('light');
      showToast(t('trainings.commentAdded'));
      if (currentTeam) {
        const name = profile?.full_name ?? '';
        sendPushToCoach(
          currentTeam.id,
          t('trainings.newCommentPush'),
          t('trainings.newCommentBody', { name, training: training?.title ?? '' })
        );
      }
    } catch {
      showToast(t('trainings.commentError'), 'error');
    }
    setSendingComment(false);
  }

  function handleDeleteComment(commentId: string) {
    haptic('warning');
    Alert.alert(t('trainings.deleteCommentConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
          deleteComment(commentId).catch(() => {});
        },
      },
    ]);
  }

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
          <FadeIn>
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
          </FadeIn>

          {isAdmin && showActions && (
            <FadeIn delay={200}>
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
            </FadeIn>
          )}
          {isAdmin && showActions && (
            <FadeIn delay={200}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.dangerSoft }, pressed && styles.pressed]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <ThemedText type="smallBold" style={{ color: colors.danger }}>{t('common.delete')}</ThemedText>
              </Pressable>
            </FadeIn>
          )}

          {training.training_exercises.length > 0 && (
            <View style={styles.exerciseSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('trainings.exercises')}
              </ThemedText>
              {training.training_exercises.map((te, index) => (
                <FadeIn key={te.id} delay={index * 80}>
                  <ThemedView type="card" style={styles.exerciseCard}>
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
                </FadeIn>
              ))}
            </View>
          )}

          {/* Commenti */}
          <FadeIn delay={400}>
            <View style={styles.commentsSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('trainings.comments')}
              </ThemedText>
              {comments.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('trainings.noComments')}
                </ThemedText>
              ) : (
                comments.map((comment) => (
                  <ThemedView key={comment.id} type="card" style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <ThemedText type="smallBold">
                        {comment.profile?.full_name ?? ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <ThemedText type="default" style={styles.commentText}>
                      {comment.text}
                    </ThemedText>
                    {(comment.profile_id === session?.user.id || isAdmin) && (
                      <Pressable
                        onPress={() => handleDeleteComment(comment.id)}
                        hitSlop={8}
                        style={styles.commentDeleteBtn}>
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </Pressable>
                    )}
                  </ThemedView>
                ))
              )}
              <View style={[styles.commentInputRow, { borderColor: colors.backgroundElement }]}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder={t('trainings.commentPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.commentInput, { color: colors.text }]}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  onPress={handleSendComment}
                  disabled={sendingComment || !commentText.trim()}
                  style={({ pressed }) => [
                    styles.sendButton,
                    { backgroundColor: colors.accent },
                    pressed && styles.pressed,
                    (!commentText.trim() || sendingComment) && { opacity: 0.4 },
                  ]}>
                  {sendingComment ? (
                    <ActivityIndicator size="small" color={colors.accentText} />
                  ) : (
                    <Ionicons name="send" size={16} color={colors.accentText} />
                  )}
                </Pressable>
              </View>
            </View>
          </FadeIn>

          {/* Esporta PDF */}
          <FadeIn delay={300}>
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
          </FadeIn>

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
  commentsSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  commentCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentText: {
    lineHeight: 20,
  },
  commentDeleteBtn: {
    alignSelf: 'flex-end',
    marginTop: Spacing.half,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.one,
    paddingRight: Spacing.one,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: Spacing.one,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
