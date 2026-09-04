import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function StatisticheLayout() {
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
      <Stack.Screen name="portiere/[id]" options={{ title: t('nav.goalkeeperProfile') }} />
    </Stack>
  );
}
