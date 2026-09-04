import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function EserciziLayout() {
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
      <Stack.Screen name="new" options={{ title: t('nav.newExercise'), presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: t('nav.exercise') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('nav.editExercise'), presentation: 'modal' }} />
      <Stack.Screen name="categoria/[id]" options={{ title: t('exercises.title') }} />
      <Stack.Screen name="scheda/index" options={{ title: t('nav.exerciseSheet') }} />
    </Stack>
  );
}
