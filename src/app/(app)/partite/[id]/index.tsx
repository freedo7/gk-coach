import { Link, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, ClipPath, Rect, Circle, Line, Path } from 'react-native-svg';

import { FadeIn } from '@/components/fade-in';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteMatch, getMatch, listPerformances } from '@/lib/api/matches';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match, MatchPerformance, ShotEvent } from '@/types/database';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Fonts, Radius, Spacing } from '@/constants/theme';

const HALF_FIELD_RATIO = 52.5 / 68;

function MiniFieldSvg({ width: W, height: H }: { width: number; height: number }) {
  const B = 3; const LW = 1; const LC = 'rgba(255,255,255,0.7)';
  const penW = W * (40.32 / 68); const penH = H * (16.5 / 52.5); const penX = (W - penW) / 2;
  const penY = H - B - penH;
  const goalAreaW = W * (18.32 / 68); const goalAreaH = H * (5.5 / 52.5);
  const goalAreaX = (W - goalAreaW) / 2; const goalAreaY = H - B - goalAreaH;
  const goalW = W * (7.32 / 68); const goalX = (W - goalW) / 2;
  const goalH = Math.max(H * (2 / 52.5), 3);
  const svgH = H + goalH + B;
  return (
    <Svg width={W} height={svgH} style={StyleSheet.absoluteFill}>
      <Defs><ClipPath id="mfc"><Rect x={0} y={0} width={W} height={H} rx={4} /></ClipPath></Defs>
      <Rect x={0} y={0} width={W} height={svgH} fill="#3a8c3f" rx={4} />
      <Rect x={B} y={B} width={W - B * 2} height={H - B * 2} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={goalX} y={H - B} width={goalW} height={goalH} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={goalAreaX} y={goalAreaY} width={goalAreaW} height={goalAreaH} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={penX} y={penY} width={penW} height={penH} fill="none" stroke={LC} strokeWidth={LW} />
      <Line x1={B} y1={B} x2={W - B} y2={B} stroke={LC} strokeWidth={LW} />
      {/* Semicerchio centrocampo */}
      <Path d={`M ${W / 2 - W * (9.15 / 68)} ${B} A ${W * (9.15 / 68)} ${W * (9.15 / 68)} 0 0 0 ${W / 2 + W * (9.15 / 68)} ${B}`} fill="none" stroke={LC} strokeWidth={LW} />
    </Svg>
  );
}

function shotCurvePath(s: ShotEvent, W: number, H: number): string {
  const sx = s.fromX * W; const sy = s.fromY * H;
  const goalStartX = W * ((68 - 7.32) / 2 / 68);
  const goalEndX = W - goalStartX;
  const ex = goalStartX + s.toX * (goalEndX - goalStartX);
  const ey = H;
  const midY = sy + (ey - sy) * 0.6;
  let cpx = (sx + ex) / 2;
  if (s.curve === 'left') cpx -= W * 0.15;
  else if (s.curve === 'right') cpx += W * 0.15;
  return `M ${sx} ${sy} Q ${cpx} ${midY} ${ex} ${ey}`;
}

function ShotPreview({ shots }: { shots: ShotEvent[] }) {
  const colors = useTheme();
  const { width: screenW } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const W = screenW - Spacing.four * 2 - Spacing.three * 2; // dentro la card
  const H = W * HALF_FIELD_RATIO;
  const fullW = screenW * 0.9;
  const fullH = fullW * HALF_FIELD_RATIO;

  const goalCount = shots.filter((s) => s.outcome === 'goal').length;
  const saveCount = shots.filter((s) => s.outcome === 'save').length;

  return (
    <>
      <View style={shotStyles.statsRow}>
        <View style={shotStyles.statBadge}>
          <View style={[shotStyles.statDot, { backgroundColor: '#FF3B30' }]} />
          <ThemedText type="small">{goalCount} gol</ThemedText>
        </View>
        <View style={shotStyles.statBadge}>
          <View style={[shotStyles.statDot, { backgroundColor: '#30D158' }]} />
          <ThemedText type="small">{saveCount} parate</ThemedText>
        </View>
      </View>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
        <View style={[shotStyles.fieldWrap, { width: W, height: H + 10 }]}>
          <MiniFieldSvg width={W} height={H} />
          <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {shots.map((s, i) => (
              <Path key={i} d={shotCurvePath(s, W, H)} fill="none"
                stroke={s.outcome === 'goal' ? '#FF3B30' : '#30D158'}
                strokeWidth={2} strokeDasharray={s.outcome === 'save' ? '5,3' : undefined} />
            ))}
          </Svg>
          {shots.map((s, i) => (
            <View key={i} style={[shotStyles.numDot, {
              left: s.fromX * W - 8, top: s.fromY * H - 8,
              backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158',
            }]}>
              <ThemedText style={shotStyles.numText}>{i + 1}</ThemedText>
            </View>
          ))}
        </View>
      </Pressable>
      {/* Distanze */}
      <View style={shotStyles.distanceList}>
        {shots.map((s, i) => (
          <View key={i} style={shotStyles.distanceItem}>
            <View style={[shotStyles.distanceNumDot, { backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158' }]}>
              <ThemedText style={shotStyles.distanceNumText}>{i + 1}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">~{s.distance ?? Math.round((1 - s.fromY) * 52.5)}m</ThemedText>
          </View>
        ))}
      </View>

      <Modal visible={open} animationType="fade" transparent statusBarTranslucent>
        <Pressable style={shotStyles.modalBg} onPress={() => setOpen(false)}>
          <View style={[shotStyles.fieldWrap, { width: fullW, height: fullH + 10 }]}>
            <MiniFieldSvg width={fullW} height={fullH} />
            <Svg width={fullW} height={fullH} style={StyleSheet.absoluteFill} pointerEvents="none">
              {shots.map((s, i) => (
                <Path key={i} d={shotCurvePath(s, fullW, fullH)} fill="none"
                  stroke={s.outcome === 'goal' ? '#FF3B30' : '#30D158'}
                  strokeWidth={2.5} strokeDasharray={s.outcome === 'save' ? '6,4' : undefined} />
              ))}
            </Svg>
            {shots.map((s, i) => (
              <View key={i} style={[shotStyles.numDot, {
                left: s.fromX * fullW - 10, top: s.fromY * fullH - 10,
                backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158',
                width: 20, height: 20, borderRadius: 10,
              }]}>
                <ThemedText style={shotStyles.numText}>{i + 1}</ThemedText>
              </View>
            ))}
          </View>
          {/* Distanze nel fullscreen */}
          <View style={shotStyles.distanceList}>
            {shots.map((s, i) => (
              <View key={i} style={shotStyles.distanceItem}>
                <View style={[shotStyles.distanceNumDot, { backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158' }]}>
                  <ThemedText style={shotStyles.distanceNumText}>{i + 1}</ThemedText>
                </View>
                <ThemedText type="small" style={{ color: '#FFF' }}>~{s.distance ?? Math.round((1 - s.fromY) * 52.5)}m</ThemedText>
              </View>
            ))}
          </View>
          <View style={[shotStyles.closeBtn, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const shotStyles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fieldWrap: {
    borderRadius: 6,
    overflow: 'visible',
    marginTop: Spacing.one,
  },
  numDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    color: '#FFF',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  distanceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 4,
  },
  distanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceNumDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceNumText: {
    color: '#FFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
  const [expandedPerfId, setExpandedPerfId] = useState<string | null>(null);

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
                  <ThemedText type="subtitle" style={{ color: colors.accent }}>{match.rating}</ThemedText>
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
                {performances.map((perf) => {
                  const isExpanded = expandedPerfId === perf.id;
                  const shotCount = perf.shots?.length ?? 0;
                  return (
                    <Pressable
                      key={perf.id}
                      onPress={() => { haptic('light'); setExpandedPerfId(isExpanded ? null : perf.id); }}>
                      <View style={styles.perfRow}>
                        <View style={styles.perfInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                            <ThemedText type="smallBold">{perf.goalkeeper?.name ?? '—'}</ThemedText>
                            {shotCount > 0 && (
                              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                            )}
                          </View>
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
                        {isExpanded && perf.shots && perf.shots.length > 0 && (
                          <ShotPreview shots={perf.shots} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
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
              <Pressable onPress={() => router.push(`/partite/${match.id}/edit`)}
                style={({ pressed }) => [styles.actionButton, { flex: 1, backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
                <Ionicons name="pencil-outline" size={18} color={colors.text} />
                <View style={{ width: 10 }} />
                <ThemedText type="smallBold">{t('matchDetail.manage')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, { paddingHorizontal: Spacing.three, backgroundColor: colors.dangerSoft }, pressed && styles.pressed]}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
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
    fontFamily: Fonts.sansBold,
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
    lineHeight: 34,
    fontFamily: Fonts.sansBold,
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
    fontFamily: Fonts.sansBold,
  },
  adminActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  actionButton: {
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
