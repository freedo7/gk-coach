import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { isValidPhone } from '@/lib/validation';
import { Fonts, Radius, Spacing } from '@/constants/theme';

export default function PhoneVerifyScreen() {
  const { t } = useTranslation();
  const { sendPhoneOtp } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const [prefix, setPrefix] = useState('+39');
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullPhone = `${prefix}${number.replace(/\s/g, '')}`;
  const canSubmit = isValidPhone(fullPhone) && !submitting;

  async function handleSend() {
    if (!canSubmit) return;
    haptic('medium');
    setError(null);
    setSubmitting(true);
    const { error: otpError } = await sendPhoneOtp(fullPhone);
    setSubmitting(false);
    if (otpError) {
      haptic('error');
      setError(otpError);
    } else {
      haptic('success');
      router.push({ pathname: '/profilo/verify-otp', params: { phone: fullPhone } });
    }
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
          <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <Ionicons name="call-outline" size={48} color={colors.accent} style={styles.icon} />
            <ThemedText type="title" style={styles.title}>{t('phoneVerify.title')}</ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
              {t('phoneVerify.subtitle')}
            </ThemedText>

            <ThemedView type="card" style={styles.card}>
              <View style={styles.phoneRow}>
                <TextInput
                  value={prefix}
                  onChangeText={setPrefix}
                  keyboardType="phone-pad"
                  style={[styles.prefixInput, { backgroundColor: colors.backgroundElement, color: colors.text, fontFamily: Fonts.sansBold }]}
                />
                <TextInput
                  placeholder={t('phoneVerify.phonePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  returnKeyType="go"
                  value={number}
                  onChangeText={setNumber}
                  onSubmitEditing={handleSend}
                  style={[styles.phoneInput, { backgroundColor: colors.backgroundElement, color: colors.text, fontFamily: Fonts.sansMedium }]}
                />
              </View>

              {error && (
                <ThemedText type="small" themeColor="accent">{error}</ThemedText>
              )}

              <Pressable
                onPress={handleSend}
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
                    {t('phoneVerify.sendCode')}
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>
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
  icon: {
    alignSelf: 'center',
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
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  prefixInput: {
    width: 64,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
    fontSize: 16,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
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
});
