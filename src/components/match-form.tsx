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
import type { MatchInput } from '@/lib/api/matches';
import { haptic } from '@/hooks/use-haptic';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<MatchInput>;
  submitLabel: string;
  onSubmit: (input: MatchInput) => Promise<void>;
}

export function MatchForm({ initial, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
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
  const [result, setResult] = useState(initial?.result ?? '');
  const [resultNotes, setResultNotes] = useState(initial?.result_notes ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = opponent.trim().length > 0 && !!matchDate && !!matchTime;

  // Progressive reveal
  const showStep2 = isEdit || (opponent.trim().length > 0 && !!matchDate && !!matchTime);
  const showStep3 = isEdit || showStep2;

  const [revealed, setRevealed] = useState({ step2: isEdit, step3: isEdit });
  useEffect(() => {
    if (showStep2 && !revealed.step2) setRevealed((r) => ({ ...r, step2: true }));
  }, [showStep2]);
  useEffect(() => {
    if (showStep3 && !revealed.step3) setRevealed((r) => ({ ...r, step3: true }));
  }, [showStep3]);

  const currentStep = useMemo(() => {
    if (!showStep2) return 1;
    if (!showStep3) return 2;
    return 3;
  }, [showStep2, showStep3]);

  async function handleSubmit() {
    haptic('medium');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
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
        result: result.trim() || null,
        result_notes: resultNotes.trim() || null,
        notes: notes.trim() || null,
      });
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
                <ThemedText type="small" themeColor="textSecondary">{t('matchForm.goalsScored')}</ThemedText>
                <TextInput
                  value={goalsScored}
                  onChangeText={setGoalsScored}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" themeColor="textSecondary">{t('matchForm.goalsConceded')}</ThemedText>
                <TextInput
                  value={goalsConceded}
                  onChangeText={setGoalsConceded}
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

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
              {t('matchForm.textResult')}
            </ThemedText>
            <TextInput
              value={result}
              onChangeText={setResult}
              placeholder={t('matchForm.textResultPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />
          </View>
        </FadeIn>
      )}

      {/* STEP 3: Note */}
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
          </View>
        </FadeIn>
      )}

      {error && (
        <ThemedText type="small" themeColor="accent" style={styles.spacing}>
          {error}
        </ThemedText>
      )}

      {revealed.step2 && (
        <FadeIn delay={isEdit ? 0 : 100}>
          <Pressable
            onPress={handleSubmit}
            disabled={!valid || submitting}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              (!valid || submitting) && styles.buttonDisabled,
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
  button: {
    marginTop: Spacing.five,
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
