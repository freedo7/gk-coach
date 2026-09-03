import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { MatchForm } from '@/components/match-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getMatch, updateMatch } from '@/lib/api/matches';
import type { Match } from '@/types/database';

export default function ModificaPartitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    getMatch(id, { isAdmin: true }).then(setMatch);
  }, [id]);

  if (!isAdmin) return <Redirect href="/partite" />;

  if (!match) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <MatchForm
        initial={match}
        submitLabel="Salva modifiche"
        onSubmit={async (input) => {
          await updateMatch(id, input);
          router.back();
        }}
      />
    </ThemedView>
  );
}
