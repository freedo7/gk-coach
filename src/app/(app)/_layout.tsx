import { Redirect } from 'expo-router';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppTabs from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

const BG_LIGHT = require('@/assets/images/sfondo.jpg');
const BG_DARK = require('@/assets/images/sfondo-dark.png');

function CreateTeamSetup() {
  const { t } = useTranslation();
  const { createTeam } = useAuth();
  const colors = useTheme();
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
        <ThemedText type="title" style={styles.gateTitle}>{t('teamSetup.createTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.gateSubtitle}>
          {t('teamSetup.createSubtitle')}
        </ThemedText>
        <ThemedView type="card" style={styles.gateCard}>
          <TextInput
            placeholder={t('teamSetup.teamNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />
          {error && <ThemedText type="small" themeColor="accent">{error}</ThemedText>}
          <Pressable
            onPress={handleCreate}
            disabled={submitting || !name.trim()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              (submitting || !name.trim()) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('teamSetup.createButton')}</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function JoinTeamSetup() {
  const { t } = useTranslation();
  const { joinTeam } = useAuth();
  const colors = useTheme();
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
        <ThemedText type="title" style={styles.gateTitle}>{t('teamSetup.joinTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.gateSubtitle}>
          {t('teamSetup.joinSubtitle')}
        </ThemedText>
        <ThemedView type="card" style={styles.gateCard}>
          <TextInput
            placeholder={t('teamSetup.teamCodePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />
          {error && <ThemedText type="small" themeColor="accent">{error}</ThemedText>}
          <Pressable
            onPress={handleJoin}
            disabled={submitting || !code.trim()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              (submitting || !code.trim()) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('teamSetup.joinButton')}</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

export default function AppLayout() {
  const { session, loading, profile, isAdmin, currentTeam } = useAuth();
  const scheme = useColorScheme();

  if (loading) return <ThemedView style={{ flex: 1 }} />;
  if (!session) return <Redirect href="/(auth)/login" />;

  if (!currentTeam) {
    if (isAdmin) return <CreateTeamSetup />;
    return <JoinTeamSetup />;
  }

  return (
    <ImageBackground
      source={scheme === 'dark' ? BG_DARK : BG_LIGHT}
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
    fontSize: 16,
  },
  button: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {},
  pressed: {
    opacity: 0.85,
  },
});
