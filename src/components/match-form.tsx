import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { MatchInput } from '@/lib/api/matches';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

interface Props {
  initial?: Partial<MatchInput>;
  submitLabel: string;
  onSubmit: (input: MatchInput) => Promise<void>;
}

export function MatchForm({ initial, submitLabel, onSubmit }: Props) {
  const [opponent, setOpponent] = useState(initial?.opponent ?? '');
  const [isHome, setIsHome] = useState(initial?.is_home ?? true);
  const [matchDate, setMatchDate] = useState<string | null>(initial?.match_date ?? null);
  const [matchTime, setMatchTime] = useState(initial?.match_time ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = opponent.trim().length > 0 && !!matchDate;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        opponent: opponent.trim(),
        is_home: isHome,
        match_date: matchDate!,
        match_time: matchTime.trim() || null,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
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
            <Pressable key={String(option.value)} onPress={() => setIsHome(option.value)} style={styles.chipFlex}>
              <ThemedView
                style={[styles.chip, selected && styles.chipSelected]}
                type={selected ? undefined : 'backgroundElement'}>
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? Colors.light.accentText : Colors.light.textSecondary}
                />
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>

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
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.spacing}>
        Note (opzionale)
      </ThemedText>
      <TextInput
        value={notes ?? ''}
        onChangeText={setNotes}
        placeholder="Luogo esatto, convocazione, altre info..."
        placeholderTextColor={Colors.light.textSecondary}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.multiline]}
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
          (!valid || submitting) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}>
        {submitting ? (
          <ActivityIndicator color={Colors.light.accentText} />
        ) : (
          <ThemedText type="smallBold" style={styles.buttonText}>
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
    backgroundColor: Colors.light.backgroundElement,
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
  },
  chipSelected: {
    backgroundColor: Colors.light.accent,
  },
  button: {
    marginTop: Spacing.five,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.accentText,
  },
  pressed: {
    opacity: 0.8,
  },
});
