import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { FadeIn } from '@/components/fade-in';
import { SkeletonList } from '@/components/skeleton';
import { IconTecnicaBase } from '@/components/icons/icon-tecnica-base';
import { IconTecnicaPodalica } from '@/components/icons/icon-tecnica-podalica';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { listCategories } from '@/lib/api/categories';
import { listExercises, type ExerciseWithCategory } from '@/lib/api/exercises';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import type { ExerciseCategory } from '@/types/database';

function CategoryIcon({ icon, size, color }: { icon: string | null; size: number; color: string }) {
  if (icon === 'body-outline') return <IconTecnicaBase size={size} color={color} />;
  if (icon === 'football-outline') return <IconTecnicaPodalica size={size} color={color} />;
  return <Ionicons name={(icon ?? 'fitness-outline') as any} size={size} color={color} />;
}

export default function EserciziScreen() {
  const { t } = useTranslation();
  const { isAdmin, currentTeam } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const [categories, setCategories] = useState<ExerciseCategory[] | null>(null);
  const [allExercises, setAllExercises] = useState<ExerciseWithCategory[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([listCategories(), listExercises(currentTeam?.id)])
        .then(([cats, exs]) => {
          if (!cancelled) {
            setCategories(cats);
            setAllExercises(exs);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, [currentTeam])
  );

  const trimmed = query.trim();
  const searchResults =
    trimmed.length > 0 && allExercises
      ? allExercises.filter((e) => e.title.toLowerCase().includes(trimmed.toLowerCase()))
      : null;

  const loading = categories === null && !error;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.pageHeader}>
          <ThemedText type="title">{t('exercises.title')}</ThemedText>
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/esercizi/new')}
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
              <ThemedText style={[styles.addBtnText, { color: colors.accentText }]}>{t('exercises.newExercise')}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.searchWrapper}>
          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('exercises.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </ThemedView>
        </View>

        {loading && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <SkeletonList count={4} type="category" />
          </ScrollView>
        )}

        {error && (
          <ThemedText type="small" themeColor="accent" style={styles.padding}>
            {error}
          </ThemedText>
        )}

        {searchResults !== null ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {searchResults.length === 0 ? (
              <EmptyState icon="search-outline" title={t('common.noResults')} subtitle={t('exercises.noResultsFor', { query: trimmed })} />
            ) : (
              searchResults.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => router.push(`/esercizi/${exercise.id}`)}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <ThemedView type="card" style={styles.resultCard}>
                    <ThemedText type="smallBold">{exercise.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {exercise.category.name}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {categories !== null && (
              <View style={styles.grid}>
                {categories.map((category, index) => (
                  <FadeIn key={category.id} delay={index * 80}>
                    <Pressable
                      style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}
                      onPress={() =>
                        router.push({
                          pathname: '/esercizi/categoria/[id]',
                          params: { id: category.id, title: category.name },
                        })
                      }>
                      <View style={[styles.categoryCard, { backgroundColor: colors.accentSoft }]}>
                        {allExercises !== null && (
                          <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                            <ThemedText type="small" style={[styles.countText, { color: colors.accentText }]}>
                              {allExercises.filter((e) => e.category_id === category.id).length}
                            </ThemedText>
                          </View>
                        )}
                        <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
                          <CategoryIcon icon={category.icon} size={28} color={colors.accent} />
                        </View>
                        <ThemedText type="smallBold" style={styles.categoryName}>
                          {category.name}
                        </ThemedText>
                      </View>
                    </Pressable>
                  </FadeIn>
                ))}
              </View>
            )}
          </ScrollView>
        )}
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
  padding: {
    padding: Spacing.four,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  cardWrapper: {
    width: '47%',
  },
  categoryCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 120,
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: Radius.pill,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  countText: {
    fontWeight: '700',
    fontSize: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
