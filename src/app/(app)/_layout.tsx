import { Redirect } from 'expo-router';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import AppTabs from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { Colors, Radius, Spacing } from '@/constants/theme';

function CreateTeamSetup() {
  const { createTeam } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    const { error: err } = await createTeam(name.trim());
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <ThemedView style={styles.gateContainer}>
      <SafeAreaView style={styles.gateSafe}>
        <ThemedText type="title" style={styles.gateTitle}>Crea la tua squadra</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.gateSubtitle}>
          Inserisci il nome della squadra per iniziare. Potrai invitare i portieri in seguito.
        </ThemedText>
        <ThemedView type="card" style={styles.gateCard}>
          <TextInput
            placeholder="Nome squadra"
            placeholderTextColor={Colors.light.textSecondary}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          {error && <ThemedText type="small" themeColor="accent">{error}</ThemedText>}
          <Pressable
            onPress={handleCreate}
            disabled={submitting || !name.trim()}
            style={({ pressed }) => [
              styles.button,
              (submitting || !name.trim()) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={Colors.light.accentText} />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>Crea squadra</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function JoinTeamSetup() {
  const { joinTeam } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) return;
    setError(null);
    setSubmitting(true);
    const { error: err } = await joinTeam(code.trim());
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <ThemedView style={styles.gateContainer}>
      <SafeAreaView style={styles.gateSafe}>
        <ThemedText type="title" style={styles.gateTitle}>Unisciti a una squadra</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.gateSubtitle}>
          Inserisci il codice squadra ricevuto dal tuo preparatore.
        </ThemedText>
        <ThemedView type="card" style={styles.gateCard}>
          <TextInput
            placeholder="Codice squadra (es. GK-ABC123)"
            placeholderTextColor={Colors.light.textSecondary}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            style={styles.input}
          />
          {error && <ThemedText type="small" themeColor="accent">{error}</ThemedText>}
          <Pressable
            onPress={handleJoin}
            disabled={submitting || !code.trim()}
            style={({ pressed }) => [
              styles.button,
              (submitting || !code.trim()) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={Colors.light.accentText} />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>Entra nella squadra</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

export default function AppLayout() {
  const { session, loading, profile, isAdmin, currentTeam } = useAuth();

  if (loading) return <ThemedView style={{ flex: 1 }} />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!profile) return <ThemedView style={{ flex: 1 }} />;

  if (!currentTeam) {
    if (isAdmin) return <CreateTeamSetup />;
    return <JoinTeamSetup />;
  }

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
  gateContainer: {
    flex: 1,
  },
  gateSafe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  gateTitle: {
    textAlign: 'center',
  },
  gateSubtitle: {
    textAlign: 'center',
  },
  gateCard: {
    marginTop: Spacing.four,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.light.accentText,
  },
  pressed: {
    opacity: 0.85,
  },
});
