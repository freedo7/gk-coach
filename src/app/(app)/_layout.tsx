import { Redirect } from 'expo-router';
import { ImageBackground, StyleSheet } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return <ThemedView style={{ flex: 1 }} />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <ImageBackground
      source={require('@/assets/images/sfondo.jpg')}
      style={styles.background}
      resizeMode="cover">
      <AppTabs />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
