import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { MatchForm } from '@/components/match-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { usePlan } from '@/hooks/use-plan';
import { createMatch, setPerformances } from '@/lib/api/matches';
import { sendPushToTeam } from '@/lib/api/push';

export default function NuovaPartitaScreen() {
  const { t } = useTranslation();
  const { isAdmin, session, currentTeam } = useAuth();
  const { canAddContent } = usePlan();
  const { show: showToast } = useToast();
  const router = useRouter();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/partite" />;
  if (!canAddContent) return <Redirect href="/profilo/paywall" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <MatchForm
        submitLabel={t('matches.createMatch')}
        onSubmit={async (input, performances) => {
          const matchId = await createMatch(input, session.user.id, currentTeam.id);
          if (performances.length > 0) await setPerformances(matchId, performances);
          sendPushToTeam(currentTeam.id, t('matches.newMatchPush'), `vs ${input.opponent}`);
          showToast(t('matches.matchCreated'));
          router.back();
        }}
      />
    </ThemedView>
  );
}
