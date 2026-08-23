import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function MatchRow({ match, muted }: { match: Match; muted?: boolean }) {
  const time = formatTime(match.match_time);
  return (
    <Link href={`/partite/${match.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="card" style={[styles.row, muted && styles.rowMuted]}>
          <View style={styles.rowLeft}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {formatDateLong(match.match_date)}
            </ThemedText>
            <ThemedText type="subtitle">{match.opponent}</ThemedText>
          </View>
          <View style={styles.rowRight}>
            <ThemedView
              type="backgroundElement"
              style={[styles.homeBadge, match.is_home && styles.homeBadgeActive]}>
              <ThemedText type="small" themeColor={match.is_home ? 'accentText' : 'textSecondary'}>
                {match.is_home ? 'Casa' : 'Fuori'}
              </ThemedText>
            </ThemedView>
            {time && (
              <ThemedText type="small" themeColor="textSecondary">
                {time}
              </ThemedText>
            )}
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.card,
    padding: Spacing.three,
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
  homeBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  homeBadgeActive: {
    backgroundColor: Colors.light.accentSoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
