import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { haptic } from '@/hooks/use-haptic';
import { EmptyState } from '@/components/empty-state';
import { MatchRow } from '@/components/match-row';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteMatch, listMatches } from '@/lib/api/matches';
import type { Match } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

const MATCH_TYPES = ['amichevole', 'campionato', 'coppa'] as const;

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function PartiteScreen() {
  const { t } = useTranslation();
  const { isAdmin, currentTeam } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [upcomingLimit, setUpcomingLimit] = useState(3);
  const [pastLimit, setPastLimit] = useState(3);

  const loadData = useCallback(() => {
    if (!currentTeam) return;
    listMatches(currentTeam.id, { isAdmin })
      .then(setMatches)
      .catch((err) => setError(err.message));
  }, [currentTeam, isAdmin]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    haptic('light');
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 600);
  }

  async function handleDelete(matchId: string) {
    const prev = matches;
    setMatches((m) => m?.filter((x) => x.id !== matchId) ?? null);
    showToast(t('matches.matchDeleted'));
    try {
      await deleteMatch(matchId);
    } catch {
      setMatches(prev);
      showToast(t('matches.deleteError'), 'error');
    }
  }

  const today = todayISO();
  const trimmed = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = matches ?? [];
    if (trimmed) list = list.filter((m) => m.opponent.toLowerCase().includes(trimmed));
    if (typeFilter) list = list.filter((m) => m.match_type === typeFilter);
    return list;
  }, [matches, trimmed, typeFilter]);

  const upcoming = filtered.filter((m) => m.match_date >= today);
  const past = filtered
    .filter((m) => m.match_date < today)
    .sort((a, b) => b.match_date.localeCompare(a.match_date));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.pageHeader}>
          <ThemedText type="title">{t('matches.title')}</ThemedText>
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/partite/new')}
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
              <ThemedText style={[styles.addBtnText, { color: colors.accentText }]}>{t('matches.newMatch')}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.searchWrapper}>
          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('matches.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </ThemedView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {MATCH_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setTypeFilter(typeFilter === type ? null : type)}
                style={[styles.chip, { backgroundColor: typeFilter === type ? colors.accent : colors.backgroundElement }]}>
                <ThemedText
                  type="small"
                  style={{ color: typeFilter === type ? colors.accentText : colors.textSecondary, fontWeight: typeFilter === type ? '600' : undefined }}>
                  {type === 'amichevole' ? t('matches.friendly') : type === 'campionato' ? t('matches.league') : t('matches.cup')}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {error && (
          <ThemedText type="small" themeColor="accent" style={styles.padding}>
            {error}
          </ThemedText>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {matches === null && !error && (
            <SkeletonList count={3} type="match" />
          )}
          {matches !== null && matches.length === 0 && (
            <EmptyState icon="football-outline" title={t('matches.noMatches')} subtitle={t('matches.addFirstMatch')} />
          )}
          {matches !== null && matches.length > 0 && filtered.length === 0 && (
            <EmptyState icon="search-outline" title={t('matches.noResults')} subtitle={t('matches.tryChangingFilters')} />
          )}

          {upcoming.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('matches.upcomingMatches')}
              </ThemedText>
              {upcoming.slice(0, upcomingLimit).map((match) => (
                <MatchRow key={match.id} match={match} onDelete={isAdmin ? () => handleDelete(match.id) : undefined} />
              ))}
              {upcoming.length > upcomingLimit && (
                <Pressable
                  onPress={() => setUpcomingLimit((l) => l + 5)}
                  style={({ pressed }) => [styles.loadMoreBtn, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="accent">{t('matches.loadMore')}</ThemedText>
                </Pressable>
              )}
            </View>
          )}

          {past.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('matches.pastMatches')}
              </ThemedText>
              {past.slice(0, pastLimit).map((match) => (
                <MatchRow key={match.id} match={match} muted onDelete={isAdmin ? () => handleDelete(match.id) : undefined} />
              ))}
              {past.length > pastLimit && (
                <Pressable
                  onPress={() => setPastLimit((l) => l + 5)}
                  style={({ pressed }) => [styles.loadMoreBtn, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="accent">{t('matches.loadMore')}</ThemedText>
                </Pressable>
              )}
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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  addBtn: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  chips: {
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  padding: {
    padding: Spacing.four,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.control,
  },
  pressed: {
    opacity: 0.7,
  },
});
