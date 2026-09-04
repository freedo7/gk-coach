import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PartiteLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: t('nav.back'),
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: t('nav.newMatch'), presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: t('nav.match') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('nav.editMatch'), presentation: 'modal' }} />
    </Stack>
  );
}
