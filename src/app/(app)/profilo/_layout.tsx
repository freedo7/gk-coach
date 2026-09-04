import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProfiloLayout() {
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
      <Stack.Screen name="edit-name" options={{ title: t('nav.editName') }} />
      <Stack.Screen name="edit-password" options={{ title: t('nav.changePassword') }} />
      <Stack.Screen name="utenti" options={{ title: t('nav.teamMembers') }} />
      <Stack.Screen name="invite" options={{ title: t('nav.inviteGoalkeepers') }} />
      <Stack.Screen name="portieri" options={{ title: t('nav.goalkeepers') }} />
      <Stack.Screen name="paywall" options={{ title: 'GK Coach Pro' }} />
    </Stack>
  );
}
