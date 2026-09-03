import { useFocusEffect } from '@react-navigation/native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { deleteMatch, getMatch } from '@/lib/api/matches';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match } from '@/types/database';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function PartitaDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { show: showToast } = useToast();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMatch(id, { isAdmin })
        .then((data) => {
          if (!cancelled) setMatch(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function handleDelete() {
    haptic('warning');
    Alert.alert('Eliminare la partita?', match?.opponent, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          showToast('Partita eliminata');
          router.back();
          deleteMatch(id).catch(() => showToast('Errore durante l\'eliminazione', 'error'));
        },
      },
    ]);
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="accent">{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!match) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      </ThemedView>
    );
  }

  const time = formatTime(match.match_time);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.badge}>
            <ThemedText type="small" themeColor="textSecondary">
              {match.is_home ? 'In casa' : 'Fuori casa'}
            </ThemedText>
          </ThemedView>

          <ThemedText type="title">{match.opponent}</ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary">
            {formatDateLong(match.match_date)}
            {time ? ` · ${time}` : ''}
          </ThemedText>
          {match.match_type === 'campionato' && match.matchday && (
            <ThemedText type="smallBold" themeColor="accent">
              Giornata {match.matchday}
            </ThemedText>
          )}

          {match.result && (
            <ThemedView type="card" style={styles.resultCard}>
              <ThemedText type="smallBold" themeColor="textSecondary">RISULTATO</ThemedText>
              <ThemedText style={styles.resultText}>{match.result}</ThemedText>
              {isAdmin && match.result_notes && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.notesText}>
                  {match.result_notes}
                </ThemedText>
              )}
            </ThemedView>
          )}

          {isAdmin && match.notes && (
            <ThemedView type="card" style={styles.notesCard}>
              <ThemedText type="smallBold" themeColor="textSecondary">NOTE</ThemedText>
              <ThemedText style={styles.notesText}>{match.notes}</ThemedText>
            </ThemedView>
          )}

          {isAdmin && (
            <View style={styles.adminActions}>
              <Link href={`/partite/${match.id}/edit`} asChild>
                <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.light.text} />
                  <ThemedText type="smallBold">Modifica</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, styles.actionButtonDelete, pressed && styles.pressed]}>
                <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
                <ThemedText type="smallBold" style={{ color: Colors.light.danger }}>Elimina</ThemedText>
              </Pressable>
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
  loader: {
    marginTop: Spacing.six,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  resultCard: {
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  notesCard: {
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  notesText: {
    lineHeight: 22,
  },
  adminActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  actionButtonDelete: {
    backgroundColor: Colors.light.dangerSoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
