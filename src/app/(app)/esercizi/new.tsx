import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ExerciseForm } from '@/components/exercise-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { usePlan } from '@/hooks/use-plan';
import { createExercise } from '@/lib/api/exercises';

export default function NuovoEsercizioScreen() {
  const { t } = useTranslation();
  const { isAdmin, session, currentTeam } = useAuth();
  const { canAddContent } = usePlan();
  const router = useRouter();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/esercizi" />;
  if (!canAddContent) return <Redirect href="/profilo/paywall" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ExerciseForm
        submitLabel={t('exercises.createExercise')}
        onSubmit={async (input) => {
          await createExercise(input, session.user.id, currentTeam.id);
          router.back();
        }}
      />
    </ThemedView>
  );
}
