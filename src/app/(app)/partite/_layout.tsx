import { Stack } from 'expo-router';

export default function PartiteLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Indietro',
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nuova partita', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Partita' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Modifica partita', presentation: 'modal' }} />
    </Stack>
  );
}
