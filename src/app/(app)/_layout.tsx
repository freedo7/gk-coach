import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return <ThemedView style={{ flex: 1 }} />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return <AppTabs />;
}
