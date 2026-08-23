import { useFocusEffect } from '@react-navigation/native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { deleteMatch, getMatch } from '@/lib/api/matches';
import { formatDateLong, formatTime } from '@/lib/format';
import type { Match } from '@/types/database';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function PartitaDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMatch(id)
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
    Alert.alert('Eliminare la partita?', match?.opponent, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteMatch(id);
          router.back();
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

          {match.notes && (
            <ThemedView type="card" style={styles.notesCard}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Note
              </ThemedText>
              <ThemedText style={styles.notesText}>{match.notes}</ThemedText>
            </ThemedView>
          )}

          {isAdmin && (
            <View style={styles.adminActions}>
              <Link href={`/partite/${match.id}/edit`} asChild>
                <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">Modifica</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="accent">
                  Elimina
                </ThemedText>
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
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
