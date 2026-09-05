import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { MatchForm } from '@/components/match-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getMatch, updateMatch, listPerformances, setPerformances } from '@/lib/api/matches';
import type { Match, MatchPerformance } from '@/types/database';

export default function ModificaPartitaScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [perfs, setPerfs] = useState<MatchPerformance[] | null>(null);

  useEffect(() => {
    getMatch(id, { isAdmin: true }).then(setMatch);
    listPerformances(id).then(setPerfs);
  }, [id]);

  if (!isAdmin) return <Redirect href="/partite" />;

  if (!match || perfs === null) {
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
        initialPerformances={perfs}
        submitLabel={t('matches.saveChanges')}
        onSubmit={async (input, performances) => {
          await updateMatch(id, input);
          await setPerformances(id, performances);
          router.back();
        }}
      />
    </ThemedView>
  );
}
