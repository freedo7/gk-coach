import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Onboarding } from '@/components/onboarding';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';

const ONBOARDING_KEY = '@gk_onboarding_done';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => setOnboardingDone(v === '1'));
  }, []);

  if (loading || onboardingDone === null) return <ThemedView style={{ flex: 1 }} />;
  if (session) return <Redirect href="/(app)" />;

  if (!onboardingDone) {
    return (
      <Onboarding
        onComplete={() => {
          AsyncStorage.setItem(ONBOARDING_KEY, '1');
          setOnboardingDone(true);
        }}
      />
    );
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
