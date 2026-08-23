import { Redirect, Stack } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) return <ThemedView style={{ flex: 1 }} />;
  if (session) return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
