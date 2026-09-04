import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { Radius, Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const colors = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'preparatore' | 'portiere'>('preparatore');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    haptic('medium');
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
    if (signUpError) { haptic('error'); setError(signUpError); }
    else { haptic('success'); setDone(true); }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Image source={require('@/assets/images/gk-coach-logo.jpeg')} style={styles.logo} />
        <ThemedText type="title" style={styles.title}>
          {t('auth.createAccount')}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" style={styles.subtitle}>
          {t('auth.registerSubtitle')}
        </ThemedText>

        <ThemedView type="card" style={styles.card}>
          {done ? (
            <ThemedText>
              {t('auth.registerSuccess')}
            </ThemedText>
          ) : (
            <>
              <TextInput
                placeholder={t('auth.fullNamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />
              <TextInput
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />
              <TextInput
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />

              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('auth.youAre')}
              </ThemedText>
              <View style={styles.roleRow}>
                <Pressable
                  onPress={() => { haptic('light'); setRole('preparatore'); }}
                  style={[styles.roleButton, { backgroundColor: role === 'preparatore' ? colors.accent : colors.backgroundElement }]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: role === 'preparatore' ? colors.accentText : colors.textSecondary }}>
                    {t('auth.coach')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => { haptic('light'); setRole('portiere'); }}
                  style={[styles.roleButton, { backgroundColor: role === 'portiere' ? colors.accent : colors.backgroundElement }]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: role === 'portiere' ? colors.accentText : colors.textSecondary }}>
                    {t('auth.goalkeeper')}
                  </ThemedText>
                </Pressable>
              </View>

              {role === 'portiere' && (
                <TextInput
                  placeholder={t('auth.teamCodePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
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
                  { backgroundColor: colors.accent },
                  (submitting || !email || !password) && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}>
                {submitting ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: colors.accentText }}>
                    {t('auth.registerButton')}
                  </ThemedText>
                )}
              </Pressable>
            </>
          )}
        </ThemedView>

        <Link href="/(auth)/login" style={styles.link}>
          <ThemedText type="link">{t('auth.hasAccount')}</ThemedText>
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
