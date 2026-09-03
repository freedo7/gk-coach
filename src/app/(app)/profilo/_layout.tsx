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
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit-name" options={{ title: 'Modifica nome' }} />
      <Stack.Screen name="edit-password" options={{ title: 'Cambia password' }} />
      <Stack.Screen name="utenti" options={{ title: 'Membri squadra' }} />
      <Stack.Screen name="invite" options={{ title: 'Invita portieri' }} />
      <Stack.Screen name="paywall" options={{ title: 'GK Coach Pro' }} />
    </Stack>
  );
}
