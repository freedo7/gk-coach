import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { TrainingForm } from '@/components/training-form';
import { useAuth } from '@/context/auth-context';
import { createTraining, setTrainingExercises } from '@/lib/api/trainings';

export default function NuovoAllenamentoScreen() {
  const { isAdmin, session } = useAuth();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();

  if (!isAdmin || !session) return <Redirect href="/" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <TrainingForm
        initial={date ? { training_date: date } : undefined}
        submitLabel="Crea allenamento"
        onSubmit={async (input, exerciseIds) => {
          const id = await createTraining(input, session.user.id);
          await setTrainingExercises(id, exerciseIds);
          router.back();
        }}
      />
    </ThemedView>
  );
}
