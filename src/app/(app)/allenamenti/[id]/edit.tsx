import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { TrainingForm } from '@/components/training-form';
import { useAuth } from '@/context/auth-context';
import {
  getTraining,
  setTrainingExercises,
  updateTraining,
  type TrainingWithExercises,
} from '@/lib/api/trainings';
import { Colors } from '@/constants/theme';

export default function ModificaAllenamentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [training, setTraining] = useState<TrainingWithExercises | null>(null);

  useEffect(() => {
    getTraining(id).then(setTraining);
  }, [id]);

  if (!isAdmin) return <Redirect href="/" />;

  if (!training) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.light.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <TrainingForm
        initial={training}
        initialExerciseIds={training.training_exercises.map((te) => te.exercise_id)}
        submitLabel="Salva modifiche"
        onSubmit={async (input, exerciseIds) => {
          await updateTraining(id, input);
          await setTrainingExercises(id, exerciseIds);
          router.back();
        }}
      />
    </ThemedView>
  );
}
