import { Stack } from 'expo-router';

export default function ProfiloLayout() {
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
      <Stack.Screen name="utenti" options={{ title: 'Utenti registrati' }} />
    </Stack>
  );
}
