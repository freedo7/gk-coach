import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';

export default function PartiteLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: t('nav.back'),
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: t('nav.newMatch'), presentation: 'modal' }} />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: t('nav.match'),
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/partite');
                }
              }}
              hitSlop={8}
              style={{ marginRight: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="[id]/edit" options={{ title: t('nav.editMatch'), presentation: 'modal' }} />
    </Stack>
  );
}
