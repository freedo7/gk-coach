import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ExerciseForm } from '@/components/exercise-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { getExercise, updateExercise, type ExerciseWithCategory } from '@/lib/api/exercises';
import { Colors } from '@/constants/theme';

export default function ModificaEsercizioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseWithCategory | null>(null);

  useEffect(() => {
    getExercise(id).then(setExercise);
  }, [id]);

  if (!isAdmin) return <Redirect href="/esercizi" />;

  if (!exercise) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.light.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ExerciseForm
        initial={exercise}
        submitLabel="Salva modifiche"
        onSubmit={async (input) => {
          await updateExercise(id, input);
          router.back();
        }}
      />
    </ThemedView>
  );
}
