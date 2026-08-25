import { Stack } from 'expo-router';

export default function EserciziLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="index" options={{ title: 'Esercizi' }} />
      <Stack.Screen name="new" options={{ title: 'Nuovo esercizio', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Esercizio' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Modifica esercizio', presentation: 'modal' }} />
      <Stack.Screen name="categoria/[id]" options={{ title: 'Esercizi' }} />
      <Stack.Screen name="scheda/index" options={{ title: 'Scheda esercizio' }} />
    </Stack>
  );
}
