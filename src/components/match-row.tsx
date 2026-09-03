import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match } from '@/types/database';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

export function MatchRow({ match, muted, onDelete }: { match: Match; muted?: boolean; onDelete?: () => void | Promise<void> }) {
  const colors = useTheme();
  const time = formatTime(match.match_time);
  const content = (
    <Link href={`/partite/${match.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="card" style={[styles.row, muted && styles.rowMuted]}>
          <View style={styles.rowLeft}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {formatDateLong(match.match_date)}
            </ThemedText>
            <ThemedText type="default" style={{ fontWeight: '700' }}>{match.opponent}</ThemedText>
            {time && (
              <ThemedText type="small" themeColor="textSecondary">
                {time}
              </ThemedText>
            )}
          </View>
          <View style={styles.rowRight}>
            {match.goals_scored != null && match.goals_conceded != null ? (
              <ThemedView type="backgroundElement" style={styles.resultBadge}>
                <ThemedText type="smallBold">{match.goals_scored} - {match.goals_conceded}</ThemedText>
              </ThemedView>
            ) : match.result ? (
              <ThemedView type="backgroundElement" style={styles.resultBadge}>
                <ThemedText type="smallBold">{match.result}</ThemedText>
              </ThemedView>
            ) : (
              <ThemedView
                type="backgroundElement"
                style={[styles.homeBadge, match.is_home && { backgroundColor: colors.accentSoft }]}>
                <Ionicons
                  name={match.is_home ? 'home' : 'airplane'}
                  size={16}
                  color={match.is_home ? colors.accentText : colors.textSecondary}
                />
              </ThemedView>
            )}
            {match.match_type && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.matchType}>
                {match.match_type.charAt(0).toUpperCase() + match.match_type.slice(1)}
                {match.match_type === 'campionato' && match.matchday ? ` · G${match.matchday}` : ''}
              </ThemedText>
            )}
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );

  return (
    <SwipeableRow
      enabled={!!onDelete}
      onDelete={onDelete ?? (() => {})}
      confirmTitle="Eliminare la partita?"
      confirmMessage={match.opponent}
    >
      {content}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  rowMuted: {
    opacity: 0.6,
  },
  rowLeft: {
    gap: Spacing.half,
    flexShrink: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  resultBadge: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  homeBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  matchType: {
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.7,
  },
});
