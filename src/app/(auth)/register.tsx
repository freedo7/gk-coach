import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'preparatore' | 'portiere'>('preparatore');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      fullName,
      role,
      role === 'portiere' && inviteCode.trim() ? inviteCode.trim() : undefined
    );
    setSubmitting(false);
    if (signUpError) setError(signUpError);
    else setDone(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Image source={require('@/assets/images/gk-coach-logo.jpeg')} style={styles.logo} />
        <ThemedText type="title" style={styles.title}>
          Crea account
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" style={styles.subtitle}>
          Registrati per accedere ad allenamenti, esercizi e partite
        </ThemedText>

        <ThemedView type="card" style={styles.card}>
          {done ? (
            <ThemedText>
              Registrazione completata. Se richiesto, controlla la tua email per confermare
              l&apos;account, poi torna al login.
            </ThemedText>
          ) : (
            <>
              <TextInput
                placeholder="Nome e cognome"
                placeholderTextColor={Colors.light.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={Colors.light.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={Colors.light.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />

              <ThemedText type="smallBold" themeColor="textSecondary">
                Sei un:
              </ThemedText>
              <View style={styles.roleRow}>
                <Pressable
                  onPress={() => setRole('preparatore')}
                  style={[styles.roleButton, role === 'preparatore' && styles.roleButtonActive]}>
                  <ThemedText
                    type="smallBold"
                    style={role === 'preparatore' ? styles.roleTextActive : styles.roleTextInactive}>
                    Preparatore
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setRole('portiere')}
                  style={[styles.roleButton, role === 'portiere' && styles.roleButtonActive]}>
                  <ThemedText
                    type="smallBold"
                    style={role === 'portiere' ? styles.roleTextActive : styles.roleTextInactive}>
                    Portiere
                  </ThemedText>
                </Pressable>
              </View>

              {role === 'portiere' && (
                <TextInput
                  placeholder="Codice squadra (es. GK-ABC123)"
                  placeholderTextColor={Colors.light.textSecondary}
                  autoCapitalize="characters"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  style={styles.input}
                />
              )}

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
                  (submitting || !email || !password) && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}>
                {submitting ? (
                  <ActivityIndicator color={Colors.light.accentText} />
                ) : (
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    Registrati
                  </ThemedText>
                )}
              </Pressable>
            </>
          )}
        </ThemedView>

        <Link href="/(auth)/login" style={styles.link}>
          <ThemedText type="link">Hai già un account? Accedi</ThemedText>
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
    width: 80,
    height: 80,
    borderRadius: Radius.control,
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
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
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 16,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleButton: {
    flex: 1,
    borderRadius: Radius.control,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  roleButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  roleTextActive: {
    color: Colors.light.accentText,
  },
  roleTextInactive: {
    color: Colors.light.textSecondary,
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
  link: {
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
});
