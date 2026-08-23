import { Stack } from 'expo-router';

export default function AllenamentiLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="index" options={{ title: 'Allenamenti' }} />
      <Stack.Screen name="new" options={{ title: 'Nuovo allenamento', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Allenamento' }} />
      <Stack.Screen
        name="[id]/edit"
        options={{ title: 'Modifica allenamento', presentation: 'modal' }}
      />
    </Stack>
  );
}
