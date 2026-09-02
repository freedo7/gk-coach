import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { TrainingForm } from '@/components/training-form';
import { useAuth } from '@/context/auth-context';
import { usePlan } from '@/hooks/use-plan';
import { createTraining, setTrainingExercises } from '@/lib/api/trainings';

export default function NuovoAllenamentoScreen() {
  const { isAdmin, session, currentTeam } = useAuth();
  const { canAddContent } = usePlan();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/" />;
  if (!canAddContent) return <Redirect href="/profilo/paywall" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <TrainingForm
        initial={date ? { training_date: date } : undefined}
        submitLabel="Crea allenamento"
        onSubmit={async (input, exerciseIds) => {
          const id = await createTraining(input, session.user.id, currentTeam.id);
          await setTrainingExercises(id, exerciseIds);
          router.back();
        }}
      />
    </ThemedView>
  );
}
