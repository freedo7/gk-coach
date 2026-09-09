import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { isValidEmail } from '@/lib/validation';
import { Fonts, Radius, Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const colors = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = isValidEmail(email) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    haptic('medium');
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await resetPassword(email.trim());
    setSubmitting(false);
    if (resetError) { haptic('error'); setError(resetError); }
    else { haptic('success'); setSent(true); }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <SafeAreaView style={styles.safeArea}>
            <ThemedText type="title" style={styles.title}>
              {t('auth.forgotPasswordTitle')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
              {t('auth.forgotPasswordSubtitle')}
            </ThemedText>

            <ThemedView type="card" style={styles.card}>
              {sent ? (
                <>
                  <Ionicons name="mail-outline" size={48} color={colors.accent} style={styles.successIcon} />
                  <ThemedText style={styles.successText}>{t('auth.resetEmailSent')}</ThemedText>
                </>
              ) : (
                <>
                  <TextInput
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="go"
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={handleSubmit}
                    style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, fontFamily: Fonts.sansMedium }]}
                  />

                  {error && (
                    <ThemedText type="small" themeColor="accent">{error}</ThemedText>
                  )}

                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: colors.accent },
                      !canSubmit && styles.buttonDisabled,
                      pressed && styles.pressed,
                    ]}>
                    {submitting ? (
                      <ActivityIndicator color={colors.accentText} />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: colors.accentText }}>
                        {t('auth.sendResetLink')}
                      </ThemedText>
                    )}
                  </Pressable>
                </>
              )}
            </ThemedView>

            <Link href="/(auth)/login" style={styles.link}>
              <ThemedText type="link">{t('auth.backToLogin')}</ThemedText>
            </Link>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
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
  successIcon: {
    alignSelf: 'center',
  },
  successText: {
    textAlign: 'center',
    lineHeight: 22,
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
