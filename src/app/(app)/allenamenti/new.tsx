import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { TrainingForm } from '@/components/training-form';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { usePlan } from '@/hooks/use-plan';
import { createTraining, setTrainingExercises } from '@/lib/api/trainings';
import { sendPushToTeam } from '@/lib/api/push';

export default function NuovoAllenamentoScreen() {
  const { isAdmin, session, currentTeam } = useAuth();
  const { canAddContent } = usePlan();
  const { show: showToast } = useToast();
  const router = useRouter();
  const { date, duplicate, title, notes, time, goalkeeper_id, exercises } = useLocalSearchParams<{
    date?: string;
    duplicate?: string;
    title?: string;
    notes?: string;
    time?: string;
    goalkeeper_id?: string;
    exercises?: string;
  }>();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/" />;
  if (!canAddContent) return <Redirect href="/profilo/paywall" />;

  const initial: Record<string, any> = {};
  if (date) initial.training_date = date;
  if (duplicate) {
    if (title) initial.title = title;
    if (notes) initial.notes = notes;
    if (time) initial.training_time = time;
    if (goalkeeper_id) initial.goalkeeper_id = goalkeeper_id;
  }

  const initialExerciseIds = duplicate && exercises ? exercises.split(',').filter(Boolean) : undefined;

  return (
    <ThemedView style={{ flex: 1 }}>
      <TrainingForm
        initial={Object.keys(initial).length > 0 ? initial : undefined}
        initialExerciseIds={initialExerciseIds}
        submitLabel="Crea allenamento"
        onSubmit={async (input, exerciseIds) => {
          const id = await createTraining(input, session.user.id, currentTeam.id);
          await setTrainingExercises(id, exerciseIds);
          sendPushToTeam(currentTeam.id, 'Nuovo allenamento', input.title);
          showToast('Allenamento creato');
          router.back();
        }}
      />
    </ThemedView>
  );
}
