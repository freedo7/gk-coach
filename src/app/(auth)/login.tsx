import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { Radius, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colors = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    haptic('medium');
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) { haptic('error'); setError(signInError); }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Image source={require('@/assets/images/gk-coach-logo.jpeg')} style={styles.logo} />
        <ThemedText type="subtitle" themeColor="textSecondary" style={styles.subtitle}>
          Accedi per vedere allenamenti, esercizi e partite
        </ThemedText>

        <ThemedView type="card" style={styles.card}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />

          {error && (
            <ThemedText type="small" themeColor="accent">
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !email || !password}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              (submitting || !email || !password) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <ThemedText type="smallBold" style={{ color: colors.accentText }}>
                Accedi
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <Link href="/(auth)/register" style={styles.link}>
          <ThemedText type="link">Non hai un account? Registrati</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  logo: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: Radius.card,
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
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
  pressed: {
    opacity: 0.85,
  },
  link: {
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
});
