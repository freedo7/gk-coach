import { Redirect, useRouter } from 'expo-router';

import { MatchForm } from '@/components/match-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { createMatch } from '@/lib/api/matches';

export default function NuovaPartitaScreen() {
  const { isAdmin, session, currentTeam } = useAuth();
  const router = useRouter();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/partite" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <MatchForm
        submitLabel="Crea partita"
        onSubmit={async (input) => {
          await createMatch(input, session.user.id, currentTeam.id);
          router.back();
        }}
      />
    </ThemedView>
  );
}
