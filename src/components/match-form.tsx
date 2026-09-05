import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/date-field';
import { FadeIn } from '@/components/fade-in';
import { GoalkeeperPicker } from '@/components/goalkeeper-picker';
import { TimeField } from '@/components/time-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getLatestMatch, type MatchInput, type PerformanceInput } from '@/lib/api/matches';
import { listGoalkeepers } from '@/lib/api/goalkeepers';
import { useAuth } from '@/context/auth-context';
import { haptic } from '@/hooks/use-haptic';
import { useTheme } from '@/hooks/use-theme';
import type { Goalkeeper, MatchPerformance } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<MatchInput>;
  initialPerformances?: MatchPerformance[];
  submitLabel: string;
  onSubmit: (input: MatchInput, performances: PerformanceInput[]) => Promise<void>;
}

interface PerfState {
  goalkeeper_id: string;
  name: string;
  rating: number;
  goals_conceded: string;
  notes: string;
}

export function MatchForm({ initial, initialPerformances, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { currentTeam } = useAuth();
  const isEdit = !!initial?.opponent;
  const [goalkeeperId, setGoalkeeperId] = useState<string | null>(initial?.goalkeeper_id ?? null);
  const [opponent, setOpponent] = useState(initial?.opponent ?? '');
  const [isHome, setIsHome] = useState(initial?.is_home ?? true);
  const [matchType, setMatchType] = useState<'amichevole' | 'campionato' | 'coppa'>(initial?.match_type ?? 'campionato');
  const [matchday, setMatchday] = useState(initial?.matchday?.toString() ?? '');
  const [matchDate, setMatchDate] = useState<string | null>(initial?.match_date ?? null);
  const [matchTime, setMatchTime] = useState(initial?.match_time ?? '');
  const [goalsScored, setGoalsScored] = useState(initial?.goals_scored?.toString() ?? '');
  const [goalsConceded, setGoalsConceded] = useState(initial?.goals_conceded?.toString() ?? '');
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [resultNotes, setResultNotes] = useState(initial?.result_notes ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Performance multi-portiere
  const [allGoalkeepers, setAllGoalkeepers] = useState<Goalkeeper[]>([]);
  const [performances, setPerformances] = useState<PerfState[]>([]);

  useEffect(() => {
    if (!currentTeam) return;
    listGoalkeepers(currentTeam.id).then((gks) => {
      setAllGoalkeepers(gks);
      // Inizializza dalle performance esistenti
      if (initialPerformances && initialPerformances.length > 0) {
        setPerformances(
          initialPerformances.map((p) => ({
            goalkeeper_id: p.goalkeeper_id,
            name: p.goalkeeper?.name ?? gks.find((g) => g.id === p.goalkeeper_id)?.name ?? '',
            rating: p.rating ?? 0,
            goals_conceded: p.goals_conceded?.toString() ?? '',
            notes: p.notes ?? '',
          }))
        );
      }
    });
  }, [currentTeam]);

  // Smart defaults
  useEffect(() => {
    if (!isEdit && !initial && currentTeam) {
      getLatestMatch(currentTeam.id).then((latest) => {
        if (!latest) return;
        if (latest.match_time && !matchTime) setMatchTime(latest.match_time);
        if (latest.goalkeeper_id && !goalkeeperId) setGoalkeeperId(latest.goalkeeper_id);
        if (latest.match_type === 'campionato' && latest.matchday != null) {
          setMatchday(String(latest.matchday + 1));
        }
      }).catch(() => {});
    }
  }, []);

  const valid = opponent.trim().length > 0 && !!matchDate && !!matchTime;

  // Progressive reveal: in edit tutto visibile, in creazione step 2 e 3 si aprono manualmente
  const [revealed, setRevealed] = useState({ step2: isEdit, step3: isEdit });

  const currentStep = useMemo(() => {
    if (!revealed.step2) return 1;
    if (!revealed.step3) return 2;
    return 3;
  }, [revealed]);

  // Portieri disponibili (non ancora aggiunti alle performance)
  const availableGks = useMemo(
    () => allGoalkeepers.filter((gk) => !performances.some((p) => p.goalkeeper_id === gk.id)),
    [allGoalkeepers, performances]
  );

  function addPerformance(gk: Goalkeeper) {
    haptic('light');
    setPerformances((prev) => [...prev, { goalkeeper_id: gk.id, name: gk.name, rating: 0, goals_conceded: '', notes: '' }]);
  }

  function removePerformance(gkId: string) {
    haptic('light');
    setPerformances((prev) => prev.filter((p) => p.goalkeeper_id !== gkId));
  }

  function updatePerformance(gkId: string, field: 'rating' | 'goals_conceded' | 'notes', value: number | string) {
    setPerformances((prev) =>
      prev.map((p) => (p.goalkeeper_id === gkId ? { ...p, [field]: value } : p))
    );
  }

  async function handleSubmit() {
    haptic('medium');
    setError(null);
    setSubmitting(true);
    try {
      const perfInputs: PerformanceInput[] = performances
        .filter((p) => p.rating > 0 || p.goals_conceded.trim() || p.notes.trim())
        .map((p) => ({
          goalkeeper_id: p.goalkeeper_id,
          rating: p.rating > 0 ? p.rating : null,
          goals_conceded: p.goals_conceded.trim() ? parseInt(p.goals_conceded.trim(), 10) : null,
          notes: p.notes.trim() || null,
        }));
      await onSubmit(
        {
          goalkeeper_id: goalkeeperId,
          opponent: opponent.trim(),
          is_home: isHome,
          match_date: matchDate!,
          match_time: matchTime.trim() || null,
          match_type: matchType,
          matchday: matchType === 'campionato' && matchday.trim() ? parseInt(matchday.trim(), 10) : null,
          goals_scored: goalsScored.trim() ? parseInt(goalsScored.trim(), 10) : null,
          goals_conceded: goalsConceded.trim() ? parseInt(goalsConceded.trim(), 10) : null,
          rating: rating > 0 ? rating : null,
          result: null,
          result_notes: resultNotes.trim() || null,
          notes: notes.trim() || null,
        },
        perfInputs
      );
    } catch (err: any) {
      setError(err?.message ?? err?.error_description ?? JSON.stringify(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Step indicator (solo in creazione) */}
      {!isEdit && (
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                { backgroundColor: s <= currentStep ? colors.accent : colors.backgroundElement },
              ]}
            />
          ))}
        </View>
      )}

      {/* STEP 1: Avversario + Casa/Trasferta + Tipo + Giornata + Data + Orario */}
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('matchForm.opponent')}
      </ThemedText>
      <TextInput
        value={opponent}
        onChangeText={setOpponent}
        placeholder={t('matchForm.opponentPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('matchForm.homeOrAway')}
      </ThemedText>
      <ThemedView style={styles.chipRow}>
        {(
          [
            { icon: 'home' as const, value: true },
            { icon: 'airplane' as const, value: false },
          ]
        ).map((option) => {
          const selected = isHome === option.value;
          return (
            <Pressable key={String(option.value)} onPress={() => { haptic('light'); setIsHome(option.value); }} style={styles.chipFlex}>
              <ThemedView
                style={[styles.chip, selected && { backgroundColor: colors.accent }]}
                type={selected ? undefined : 'backgroundElement'}>
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? colors.accentText : colors.textSecondary}
                />
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('matchForm.matchType')}
      </ThemedText>
      <ThemedView style={styles.chipRow}>
        {(
          [
            { value: 'amichevole', icon: 'people-outline', label: t('matchForm.matchTypeFriendly') },
            { value: 'campionato', icon: 'ribbon-outline', label: t('matchForm.matchTypeLeague') },
            { value: 'coppa',      icon: 'trophy-outline', label: t('matchForm.matchTypeCup') },
          ] as const
        ).map((option) => {
          const selected = matchType === option.value;
          return (
            <Pressable key={option.value} onPress={() => { haptic('light'); setMatchType(option.value); }} style={styles.chipFlex}>
              <ThemedView
                style={[styles.chip, selected && { backgroundColor: colors.accent }]}
                type={selected ? undefined : 'backgroundElement'}>
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? colors.accentText : colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: selected ? colors.accentText : colors.textSecondary }}>
                  {option.label}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>

      {matchType === 'campionato' && (
        <>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
            {t('matchForm.matchday')}
          </ThemedText>
          <TextInput
            value={matchday}
            onChangeText={setMatchday}
            placeholder={t('matchForm.matchdayPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />
        </>
      )}

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('matchForm.date')}
      </ThemedText>
      <ThemedView style={styles.spacingSmall}>
        <DateField value={matchDate} onChange={setMatchDate} />
      </ThemedView>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        {t('matchForm.time')}
      </ThemedText>
      <TimeField
        value={matchTime || null}
        onChange={(v) => setMatchTime(v ?? '')}
      />

      {/* STEP 2: Portiere + Risultato + Voto + Risultato testuale */}
      {revealed.step2 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('matchForm.goalkeeper')}
            </ThemedText>
            <GoalkeeperPicker value={goalkeeperId} onChange={setGoalkeeperId} />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('matchForm.resultSection')}
            </ThemedText>
            <View style={styles.chipRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {isHome ? t('matchForm.us') : opponent.trim() || t('matchForm.opponent')}
                </ThemedText>
                <TextInput
                  value={isHome ? goalsScored : goalsConceded}
                  onChangeText={isHome ? setGoalsScored : setGoalsConceded}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                />
              </View>
              <ThemedText style={styles.scoreSeparator}>-</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {isHome ? opponent.trim() || t('matchForm.opponent') : t('matchForm.us')}
                </ThemedText>
                <TextInput
                  value={isHome ? goalsConceded : goalsScored}
                  onChangeText={isHome ? setGoalsConceded : setGoalsScored}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                />
              </View>
            </View>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('matchForm.ratingSection')}
            </ThemedText>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => { haptic('light'); setRating(rating === n ? 0 : n); }}
                  style={[
                    styles.ratingDot,
                    { backgroundColor: n <= rating ? colors.accent : colors.backgroundElement },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: n <= rating ? colors.accentText : colors.textSecondary, fontWeight: '700' }}>
                    {n}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </FadeIn>
      )}

      {/* STEP 3: Note + Valutazioni portieri */}
      {revealed.step3 && (
        <FadeIn delay={isEdit ? 0 : 200}>
          <View style={styles.stepSection}>
            <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />

            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('matchForm.resultNotes')}
            </ThemedText>
            <TextInput
              value={resultNotes}
              onChangeText={setResultNotes}
              placeholder={t('matchForm.resultNotesPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('matchForm.generalNotes')}
            </ThemedText>
            <TextInput
              value={notes ?? ''}
              onChangeText={setNotes}
              placeholder={t('matchForm.generalNotesPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />

            {/* Valutazioni portieri */}
            {allGoalkeepers.length > 0 && (
              <View style={styles.perfSection}>
                <View style={[styles.stepDivider, { backgroundColor: colors.backgroundElement }]} />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('matchForm.goalkeeperPerformances')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('matchForm.goalkeeperPerformancesHint')}
                </ThemedText>

                {performances.map((perf) => (
                  <ThemedView key={perf.goalkeeper_id} type="card" style={styles.perfCard}>
                    <View style={styles.perfHeader}>
                      <ThemedText type="smallBold">{perf.name}</ThemedText>
                      <Pressable onPress={() => removePerformance(perf.goalkeeper_id)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={colors.danger} />
                      </Pressable>
                    </View>

                    <View style={styles.perfFieldRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="small" themeColor="textSecondary">{t('matchForm.perfGoalsConceded')}</ThemedText>
                        <TextInput
                          value={perf.goals_conceded}
                          onChangeText={(v) => updatePerformance(perf.goalkeeper_id, 'goals_conceded', v)}
                          placeholder="0"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="number-pad"
                          style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                        />
                      </View>
                      <View style={{ flex: 2 }}>
                        <ThemedText type="small" themeColor="textSecondary">{t('matchForm.ratingSection')}</ThemedText>
                        <View style={[styles.ratingRow, { marginTop: Spacing.one }]}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <Pressable
                              key={n}
                              onPress={() => {
                                haptic('light');
                                updatePerformance(perf.goalkeeper_id, 'rating', perf.rating === n ? 0 : n);
                              }}
                              style={[
                                styles.ratingDot,
                                { backgroundColor: n <= perf.rating ? colors.accent : colors.backgroundElement },
                              ]}>
                              <ThemedText
                                type="small"
                                style={{ color: n <= perf.rating ? colors.accentText : colors.textSecondary, fontWeight: '700' }}>
                                {n}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    <TextInput
                      value={perf.notes}
                      onChangeText={(v) => updatePerformance(perf.goalkeeper_id, 'notes', v)}
                      placeholder={t('matchForm.performanceNotesPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={2}
                      style={[styles.input, styles.perfNotes, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                    />
                  </ThemedView>
                ))}

                {/* Aggiungi portiere */}
                {availableGks.length > 0 && (
                  <View style={styles.addPerfRow}>
                    {availableGks.map((gk) => (
                      <Pressable key={gk.id} onPress={() => addPerformance(gk)}>
                        <ThemedView type="backgroundElement" style={styles.addPerfChip}>
                          <Ionicons name="add" size={14} color={colors.accent} />
                          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                            {gk.name}
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </FadeIn>
      )}

      {error && (
        <ThemedText type="small" themeColor="accent" style={styles.spacing}>
          {error}
        </ThemedText>
      )}

      {valid && (
        <FadeIn delay={isEdit ? 0 : 100}>
          {/* Bottoni per aggiungere step opzionali (solo in creazione) */}
          {!isEdit && !revealed.step2 && (
            <Pressable
              onPress={() => { haptic('light'); setRevealed((r) => ({ ...r, step2: true })); }}
              style={styles.addStepLink}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <ThemedText type="smallBold" style={{ color: colors.accent }}>
                {t('matchForm.addDetails')}
              </ThemedText>
            </Pressable>
          )}
          {!isEdit && revealed.step2 && !revealed.step3 && (
            <Pressable
              onPress={() => { haptic('light'); setRevealed((r) => ({ ...r, step3: true })); }}
              style={styles.addStepLink}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <ThemedText type="smallBold" style={{ color: colors.accent }}>
                {t('matchForm.addNotes')}
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              submitting && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <ThemedText type="smallBold" style={{ color: colors.accentText }}>
                {submitLabel}
              </ThemedText>
            )}
          </Pressable>
        </FadeIn>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepSection: {
    marginTop: Spacing.two,
  },
  stepDivider: {
    height: 1,
    marginBottom: Spacing.four,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
    fontSize: 16,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  spacing: {
    marginTop: Spacing.four,
  },
  spacingSmall: {
    marginTop: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  chipFlex: {
    flex: 1,
  },
  chip: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  ratingDot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 36,
  },
  scoreSeparator: {
    fontSize: 24,
    fontWeight: '700',
    alignSelf: 'flex-end',
    paddingBottom: Spacing.three,
    opacity: 0.3,
  },
  perfFieldRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  perfSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  perfCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfLabel: {
    marginTop: Spacing.one,
  },
  perfNotes: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  addPerfRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  addPerfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  addStepLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.four,
  },
  button: {
    marginTop: Spacing.four,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
