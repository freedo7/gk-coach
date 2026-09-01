import { Redirect, useRouter } from 'expo-router';

import { ExerciseForm } from '@/components/exercise-form';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { createExercise } from '@/lib/api/exercises';

export default function NuovoEsercizioScreen() {
  const { isAdmin, session, currentTeam } = useAuth();
  const router = useRouter();

  if (!isAdmin || !session || !currentTeam) return <Redirect href="/esercizi" />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ExerciseForm
        submitLabel="Crea esercizio"
        onSubmit={async (input) => {
          await createExercise(input, session.user.id, currentTeam.id);
          router.back();
        }}
      />
    </ThemedView>
  );
}
