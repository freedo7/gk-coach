import { Stack } from 'expo-router';

export default function StatisticheLayout() {
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
      <Stack.Screen name="portiere/[id]" options={{ title: 'Scheda portiere' }} />
    </Stack>
  );
}
