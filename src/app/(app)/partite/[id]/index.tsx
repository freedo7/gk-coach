import { Link, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/fade-in';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteMatch, getMatch, listPerformances } from '@/lib/api/matches';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match, MatchPerformance } from '@/types/database';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

export default function PartitaDettaglioScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const colors = useTheme();
  const { show: showToast } = useToast();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [performances, setPerformances] = useState<MatchPerformance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMatch(id, { isAdmin })
        .then((data) => {
          if (!cancelled) setMatch(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      listPerformances(id)
        .then((data) => {
          if (!cancelled) setPerformances(data);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function handleDelete() {
    haptic('warning');
    Alert.alert(t('matches.deleteMatchConfirm'), match?.opponent, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          showToast(t('matches.matchDeleted'));
          router.back();
          deleteMatch(id).catch(() => showToast(t('matches.deleteError'), 'error'));
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

  if (!match) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      </ThemedView>
    );
  }

  const time = formatTime(match.match_time);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <FadeIn>
            <ThemedView type="backgroundElement" style={styles.badge}>
              <ThemedText type="small" themeColor="textSecondary">
                {match.is_home ? t('matches.homeLabel') : t('matches.awayLabel')}
              </ThemedText>
            </ThemedView>

            <ThemedText type="title">{match.opponent}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary">
              {formatDateLong(match.match_date)}
              {time ? ` · ${time}` : ''}
            </ThemedText>
            {match.match_type === 'campionato' && match.matchday && (
              <ThemedText type="smallBold" themeColor="accent">
                {t('matches.matchday')} {match.matchday}
              </ThemedText>
            )}
          </FadeIn>

          {(match.goals_scored != null || match.result) && (
            <FadeIn delay={100}>
              <ThemedView type="card" style={[styles.resultCard, { borderColor: colors.accent }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('matches.result')}</ThemedText>
                {match.goals_scored != null && match.goals_conceded != null ? (
                  <View style={styles.scoreRow}>
                    <ThemedText style={styles.resultText}>{match.goals_scored}</ThemedText>
                    <ThemedText style={[styles.resultText, { opacity: 0.4 }]}>-</ThemedText>
                    <ThemedText style={styles.resultText}>{match.goals_conceded}</ThemedText>
                    {match.goals_conceded === 0 && (
                      <View style={[styles.cleanSheetBadge, { backgroundColor: colors.accentSoft }]}>
                        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('matches.cleanSheet')}</ThemedText>
                      </View>
                    )}
                  </View>
                ) : match.result ? (
                  <ThemedText style={styles.resultText}>{match.result}</ThemedText>
                ) : null}
                {isAdmin && match.result_notes && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.notesText}>
                    {match.result_notes}
                  </ThemedText>
                )}
              </ThemedView>
            </FadeIn>
          )}

          {match.rating != null && performances.length === 0 && (
            <FadeIn delay={200}>
              <ThemedView type="card" style={styles.notesCard}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('matches.goalkeeperRating')}</ThemedText>
                <View style={styles.ratingDisplay}>
                  <ThemedText style={[styles.ratingNumber, { color: colors.accent }]}>{match.rating}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">/10</ThemedText>
                </View>
              </ThemedView>
            </FadeIn>
          )}

          {performances.length > 0 && (
            <FadeIn delay={250}>
              <ThemedView type="card" style={styles.notesCard}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('matchForm.goalkeeperPerformances')}
                </ThemedText>
                {performances.map((perf) => (
                  <View key={perf.id} style={styles.perfRow}>
                    <View style={styles.perfInfo}>
                      <ThemedText type="smallBold">{perf.goalkeeper?.name ?? '—'}</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                        {perf.goals_conceded != null && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {perf.goals_conceded} {t('matchForm.perfGoalsConceded').toLowerCase()}
                          </ThemedText>
                        )}
                        {perf.rating != null && (
                          <View style={styles.perfRating}>
                            <ThemedText style={[styles.perfRatingNumber, { color: colors.accent }]}>
                              {perf.rating}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">/10</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                    {perf.notes && (
                      <ThemedText type="small" themeColor="textSecondary">{perf.notes}</ThemedText>
                    )}
                  </View>
                ))}
              </ThemedView>
            </FadeIn>
          )}

          {isAdmin && match.notes && (
            <FadeIn delay={300}>
              <ThemedView type="card" style={styles.notesCard}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('matches.notes')}</ThemedText>
                <ThemedText style={styles.notesText}>{match.notes}</ThemedText>
              </ThemedView>
            </FadeIn>
          )}

          {isAdmin && (
            <View style={styles.adminActions}>
              <Link href={`/partite/${match.id}/edit`} asChild>
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
            </View>
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
    gap: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  resultCard: {
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  cleanSheetBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    marginLeft: Spacing.two,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  ratingNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  notesCard: {
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  notesText: {
    lineHeight: 22,
  },
  perfRow: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  perfInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfRating: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  perfRatingNumber: {
    fontSize: 20,
    fontWeight: '800',
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
  pressed: {
    opacity: 0.7,
  },
});
