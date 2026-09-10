import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AnimatedPressable } from '@/components/animated-pressable';
import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match } from '@/types/database';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Radius, Spacing } from '@/constants/theme';

/** Determine result outcome for color coding */
function getOutcome(match: Match): 'win' | 'loss' | 'draw' | null {
  if (match.goals_scored != null && match.goals_conceded != null) {
    if (match.goals_scored > match.goals_conceded) return 'win';
    if (match.goals_scored < match.goals_conceded) return 'loss';
    return 'draw';
  }
  if (match.result) {
    const r = match.result.toLowerCase().trim();
    if (r === 'v' || r === 'w' || r === 'vittoria' || r === 'win') return 'win';
    if (r === 's' || r === 'l' || r === 'sconfitta' || r === 'loss') return 'loss';
    if (r === 'p' || r === 'd' || r === 'pareggio' || r === 'draw') return 'draw';
  }
  return null;
}

const OUTCOME_COLORS = {
  win: '#34C759',
  loss: '#FF3B30',
  draw: '#8E8E93',
} as const;

const OUTCOME_BG = {
  win: 'rgba(52,199,89,0.15)',
  loss: 'rgba(255,59,48,0.15)',
  draw: 'rgba(142,142,147,0.15)',
} as const;

export function MatchRow({ match, muted, onDelete }: { match: Match; muted?: boolean; onDelete?: () => void | Promise<void> }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const time = formatTime(match.match_time);
  const outcome = getOutcome(match);
  const sideBarColor = match.is_home ? colors.accent : '#FF9500';

  const content = (
    <Link href={`/partite/${match.id}`} asChild>
      <AnimatedPressable>
        <ThemedView type="card" style={[styles.row, { borderLeftColor: sideBarColor }, muted && styles.rowMuted]}>
          <View style={styles.rowContent}>
            <View style={styles.rowLeft}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {formatDateLong(match.match_date)}
              </ThemedText>
              <ThemedText type="default" style={styles.opponent} numberOfLines={1}>{match.opponent}</ThemedText>
              <View style={styles.metaRow}>
                {/* Home/Away badge */}
                <View style={[styles.locationBadge, { backgroundColor: match.is_home ? colors.accentSoft : '#FFF3E0' }]}>
                  <Ionicons
                    name={match.is_home ? 'home' : 'airplane'}
                    size={12}
                    color={match.is_home ? colors.accent : '#FF9500'}
                  />
                  <ThemedText style={[styles.locationText, { color: match.is_home ? colors.accent : '#FF9500' }]}>
                    {match.is_home ? t('matches.home') : t('matches.away')}
                  </ThemedText>
                </View>
                {time && (
                  <View style={styles.timeChip}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">{time}</ThemedText>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.rowRight}>
              {/* Result badge with color coding */}
              {match.goals_scored != null && match.goals_conceded != null ? (
                <ThemedView type="backgroundElement" style={[styles.resultBadge, outcome && { backgroundColor: OUTCOME_BG[outcome] }]}>
                  <ThemedText type="smallBold" style={[styles.resultText, outcome && { color: OUTCOME_COLORS[outcome] }]}>
                    {match.goals_scored} - {match.goals_conceded}
                  </ThemedText>
                </ThemedView>
              ) : match.result ? (
                <ThemedView type="backgroundElement" style={[styles.resultBadge, outcome && { backgroundColor: OUTCOME_BG[outcome] }]}>
                  <ThemedText type="smallBold" style={[styles.resultText, outcome && { color: OUTCOME_COLORS[outcome] }]}>
                    {match.result}
                  </ThemedText>
                </ThemedView>
              ) : null}
              {match.match_type && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.matchType}>
                  {match.match_type === 'amichevole' ? t('matches.friendly') : match.match_type === 'campionato' ? t('matches.league') : t('matches.cup')}
                  {match.match_type === 'campionato' && match.matchday ? ` · G${match.matchday}` : ''}
                </ThemedText>
              )}
            </View>
          </View>
        </ThemedView>
      </AnimatedPressable>
    </Link>
  );

  return (
    <SwipeableRow
      enabled={!!onDelete}
      onDelete={onDelete ?? (() => {})}
      confirmTitle={t('matches.deleteMatchConfirm')}
      confirmMessage={match.opponent}
    >
      {content}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.card,
    borderLeftWidth: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rowMuted: {
    opacity: 0.7,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowLeft: {
    flex: 1,
    gap: Spacing.half,
    marginRight: Spacing.two,
  },
  opponent: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  locationText: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.one,
    flexShrink: 0,
  },
  resultBadge: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
  },
  resultText: {
    fontSize: 16,
  },
  matchType: {
    textAlign: 'right',
  },
});
