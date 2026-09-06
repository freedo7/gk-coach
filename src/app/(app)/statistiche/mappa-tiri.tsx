import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, ClipPath, Rect, Line, Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { listMatches, listAllPerformances } from '@/lib/api/matches';
import { formatDateLong } from '@/lib/format';
import type { Match, MatchPerformance, ShotEvent } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

const HALF_FIELD_RATIO = 52.5 / 68;

// ─── Mini campo con porta in basso ───
function MiniFieldSvg({ width: W, height: H }: { width: number; height: number }) {
  const B = 3; const LW = 1; const LC = 'rgba(255,255,255,0.7)';
  const penW = W * (40.32 / 68); const penH = H * (16.5 / 52.5); const penX = (W - penW) / 2;
  const penY = H - B - penH;
  const goalAreaW = W * (18.32 / 68); const goalAreaH = H * (5.5 / 52.5);
  const goalAreaX = (W - goalAreaW) / 2; const goalAreaY = H - B - goalAreaH;
  const goalW = W * (7.32 / 68); const goalX = (W - goalW) / 2;
  const goalH = Math.max(H * (2 / 52.5), 3);
  const svgH = H + goalH + B;
  const centerR = W * (9.15 / 68);
  return (
    <Svg width={W} height={svgH} style={StyleSheet.absoluteFill}>
      <Defs><ClipPath id="mfc"><Rect x={0} y={0} width={W} height={H} rx={4} /></ClipPath></Defs>
      <Rect x={0} y={0} width={W} height={svgH} fill="#3a8c3f" rx={4} />
      <Rect x={B} y={B} width={W - B * 2} height={H - B * 2} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={goalX} y={H - B} width={goalW} height={goalH} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={goalAreaX} y={goalAreaY} width={goalAreaW} height={goalAreaH} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={penX} y={penY} width={penW} height={penH} fill="none" stroke={LC} strokeWidth={LW} />
      <Line x1={B} y1={B} x2={W - B} y2={B} stroke={LC} strokeWidth={LW} />
      <Path d={`M ${W / 2 - centerR} ${B} A ${centerR} ${centerR} 0 0 0 ${W / 2 + centerR} ${B}`} fill="none" stroke={LC} strokeWidth={LW} />
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

export default function MappaTiriScreen() {
  const { t } = useTranslation();
  const { isAdmin, currentTeam } = useAuth();
  const { gk } = useLocalSearchParams<{ gk?: string }>();
  const colors = useTheme();
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();

  const [matches, setMatches] = useState<Match[]>([]);
  const [performances, setPerformances] = useState<MatchPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentTeam) return;
    try {
      const [m, perfs] = await Promise.all([
        listMatches(currentTeam.id, { isAdmin }),
        listAllPerformances(currentTeam.id),
      ]);
      setMatches(m);
      setPerformances(perfs);
    } finally {
      setLoading(false);
    }
  }, [currentTeam, isAdmin]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Partite che hanno almeno una performance con shots (filtrate per portiere se selezionato)
  const matchesWithShots = useMemo(() => {
    const filtered = gk ? performances.filter((p) => p.goalkeeper_id === gk) : performances;
    const perfsByMatch: Record<string, MatchPerformance[]> = {};
    filtered.forEach((p) => {
      if (p.shots && p.shots.length > 0) {
        if (!perfsByMatch[p.match_id]) perfsByMatch[p.match_id] = [];
        perfsByMatch[p.match_id].push(p);
      }
    });
    return matches
      .filter((m) => perfsByMatch[m.id])
      .map((m) => ({ match: m, perfs: perfsByMatch[m.id] }))
      .sort((a, b) => b.match.match_date.localeCompare(a.match.match_date));
  }, [matches, performances, gk]);

  const cardW = screenW - Spacing.four * 2;
  const fieldW = cardW - Spacing.three * 2;
  const fieldH = fieldW * HALF_FIELD_RATIO;

  if (loading) return <ThemedView style={styles.container}><SkeletonList /></ThemedView>;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        {matchesWithShots.length === 0 ? (
          <ThemedView type="card" style={[styles.card, styles.emptyCard]}>
            <Ionicons name="locate-outline" size={40} color={colors.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {t('stats.noShots')}
            </ThemedText>
          </ThemedView>
        ) : (
          matchesWithShots.map(({ match, perfs }) => {
            const isExpanded = expandedId === match.id;
            const totalGoals = perfs.reduce((sum, p) => sum + p.shots!.filter((s) => s.outcome === 'goal').length, 0);
            const totalSaves = perfs.reduce((sum, p) => sum + p.shots!.filter((s) => s.outcome === 'save').length, 0);
            return (
              <Pressable
                key={match.id}
                onPress={() => { haptic('light'); setExpandedId(isExpanded ? null : match.id); }}>
                <ThemedView type="card" style={styles.card}>
                  {/* Header partita */}
                  <View style={styles.matchHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">
                        {match.is_home ? `${currentTeam?.name ?? ''} ${t('stats.vsMatch')} ${match.opponent}` : `${match.opponent} ${t('stats.vsMatch')} ${currentTeam?.name ?? ''}`}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDateLong(match.match_date)}
                        {match.goals_scored != null && match.goals_conceded != null && (
                          ` — ${match.goals_scored}-${match.goals_conceded}`
                        )}
                      </ThemedText>
                    </View>
                    <View style={styles.headerRight}>
                      <View style={styles.shotStats}>
                        <View style={styles.shotStatBadge}>
                          <View style={[styles.shotDot, { backgroundColor: '#FF3B30' }]} />
                          <ThemedText type="small" style={{ color: '#FF3B30' }}>{totalGoals}</ThemedText>
                        </View>
                        <View style={styles.shotStatBadge}>
                          <View style={[styles.shotDot, { backgroundColor: '#30D158' }]} />
                          <ThemedText type="small" style={{ color: '#30D158' }}>{totalSaves}</ThemedText>
                        </View>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                    </View>
                  </View>

                  {/* Shot maps (espandibile) */}
                  {isExpanded && perfs.map((perf) => {
                    const shots = perf.shots!;
                    return (
                      <View key={perf.id} style={styles.perfBlock}>
                        {perfs.length > 1 && (
                          <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 4 }}>
                            {perf.goalkeeper?.name}
                          </ThemedText>
                        )}
                        <View style={[styles.fieldWrap, { width: fieldW, height: fieldH + 10 }]}>
                          <MiniFieldSvg width={fieldW} height={fieldH} />
                          <Svg width={fieldW} height={fieldH} style={StyleSheet.absoluteFill} pointerEvents="none">
                            {shots.map((s, i) => (
                              <Path key={i} d={shotCurvePath(s, fieldW, fieldH)} fill="none"
                                stroke={s.outcome === 'goal' ? '#FF3B30' : '#30D158'}
                                strokeWidth={2} strokeDasharray={s.outcome === 'save' ? '5,3' : undefined} />
                            ))}
                          </Svg>
                          {shots.map((s, i) => (
                            <View key={i} style={[styles.numDot, {
                              left: s.fromX * fieldW - 8, top: s.fromY * fieldH - 8,
                              backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158',
                            }]}>
                              <ThemedText style={styles.numText}>{i + 1}</ThemedText>
                            </View>
                          ))}
                        </View>
                        {/* Distanze */}
                        <View style={styles.distanceList}>
                          {shots.map((s, i) => (
                            <View key={i} style={styles.distanceItem}>
                              <View style={[styles.distanceNumDot, { backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158' }]}>
                                <ThemedText style={styles.distanceNumText}>{i + 1}</ThemedText>
                              </View>
                              <ThemedText type="small" themeColor="textSecondary">~{s.distance ?? Math.round((1 - s.fromY) * 52.5)}m</ThemedText>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </ThemedView>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    gap: Spacing.two,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.four * 2,
    gap: Spacing.two,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  perfBlock: {
    gap: 4,
  },
  shotStats: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: 4,
  },
  shotStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fieldWrap: {
    borderRadius: 6,
    overflow: 'visible',
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
});
