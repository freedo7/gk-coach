import { Stack } from 'expo-router';

export default function PartiteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="index" options={{ title: 'Partite' }} />
      <Stack.Screen name="new" options={{ title: 'Nuova partita', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Partita' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Modifica partita', presentation: 'modal' }} />
    </Stack>
  );
}
