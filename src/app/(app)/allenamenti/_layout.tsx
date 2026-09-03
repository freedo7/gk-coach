import { Stack } from 'expo-router';

export default function AllenamentiLayout() {
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
      <Stack.Screen name="new" options={{ title: 'Nuovo allenamento', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Allenamento' }} />
      <Stack.Screen
        name="[id]/edit"
        options={{ title: 'Modifica allenamento', presentation: 'modal' }}
      />
    </Stack>
  );
}
