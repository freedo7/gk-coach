import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
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
  const colors = useTheme();
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

  const valid = opponent.trim().length > 0 && !!matchDate;

  async function handleSubmit() {
    haptic('medium');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
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
      <ThemedText type="smallBold" themeColor="textSecondary">
        Avversario
      </ThemedText>
      <TextInput
        value={opponent}
        onChangeText={setOpponent}
        placeholder="Nome squadra avversaria"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Casa o trasferta
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
        Tipo di partita
      </ThemedText>
      <ThemedView style={styles.chipRow}>
        {(
          [
            { value: 'amichevole', icon: 'people-outline', label: 'Amichevole' },
            { value: 'campionato', icon: 'ribbon-outline', label: 'Campionato' },
            { value: 'coppa',      icon: 'trophy-outline', label: 'Coppa' },
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
            Giornata (opzionale)
          </ThemedText>
          <TextInput
            value={matchday}
            onChangeText={setMatchday}
            placeholder="Es. 1"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />
        </>
      )}

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Data
      </ThemedText>
      <ThemedView style={styles.spacingSmall}>
        <DateField value={matchDate} onChange={setMatchDate} />
      </ThemedView>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Orario (opzionale)
      </ThemedText>
      <TextInput
        value={matchTime ?? ''}
        onChangeText={setMatchTime}
        placeholder="18:30"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Risultato (opzionale)
      </ThemedText>
      <View style={styles.chipRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" themeColor="textSecondary">Gol fatti</ThemedText>
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
          <ThemedText type="small" themeColor="textSecondary">Gol subiti</ThemedText>
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
        Voto portiere (opzionale)
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
        Risultato testuale (opzionale)
      </ThemedText>
      <TextInput
        value={result}
        onChangeText={setResult}
        placeholder="Es. 2-1"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Note sul risultato (opzionale)
      </ThemedText>
      <TextInput
        value={resultNotes}
        onChangeText={setResultNotes}
        placeholder="Parate, gol subiti, prestazione..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Note generali (opzionale)
      </ThemedText>
      <TextInput
        value={notes ?? ''}
        onChangeText={setNotes}
        placeholder="Luogo esatto, convocazione, altre info..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundElement, color: colors.text }]}
      />

      {error && (
        <ThemedText type="small" themeColor="accent" style={styles.spacing}>
          {error}
        </ThemedText>
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
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
