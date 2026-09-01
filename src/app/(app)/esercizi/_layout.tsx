import { Stack } from 'expo-router';

export default function EserciziLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Indietro',
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nuovo esercizio', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Esercizio' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Modifica esercizio', presentation: 'modal' }} />
      <Stack.Screen name="categoria/[id]" options={{ title: 'Esercizi' }} />
      <Stack.Screen name="scheda/index" options={{ title: 'Scheda esercizio' }} />
    </Stack>
  );
}
