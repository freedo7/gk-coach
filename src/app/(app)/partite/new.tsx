import { Redirect, useRouter } from 'expo-router';

import { MatchForm } from '@/components/match-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { usePlan } from '@/hooks/use-plan';
import { createMatch } from '@/lib/api/matches';

export default function NuovaPartitaScreen() {
  const { isAdmin, session, currentTeam } = useAuth();
  const { canAddContent } = usePlan();
  const { show: showToast } = useToast();
  const router = useRouter();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/partite" />;
  if (!canAddContent) return <Redirect href="/profilo/paywall" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <MatchForm
        submitLabel="Crea partita"
        onSubmit={async (input) => {
          await createMatch(input, session.user.id, currentTeam.id);
          showToast('Partita creata');
          router.back();
        }}
      />
    </ThemedView>
  );
}
