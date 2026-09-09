import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { runOnJS } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { useToast } from '@/context/toast-context';
import { useOtpAnimation } from '@/hooks/use-otp-animation';
import { Fonts, Radius, Spacing } from '@/constants/theme';

const DIGIT_COUNT = 6;
const RESEND_SECONDS = 30;

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyPhoneOtp, sendPhoneOtp } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const { width: screenW } = useWindowDimensions();
  const containerWidth = screenW - Spacing.four * 2 - Spacing.four * 2; // screen padding + card padding

  const {
    phase,
    digitStyles,
    checkmarkStyle,
    orbitRingStyle,
    startOrbit,
    showSuccess,
    showError,
    reset,
    DIGIT_SIZE,
    ORBIT_RADIUS,
  } = useOtpAnimation(containerWidth);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Resend countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const maskedPhone = phone
    ? `${phone.slice(0, 4)} ${'•'.repeat(Math.max(0, phone.length - 7))} ${phone.slice(-3)}`
    : '';

  const handleCodeChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, DIGIT_COUNT);
    setCode(digits);
    if (error) setError(null);

    // Auto-submit when all digits entered
    if (digits.length === DIGIT_COUNT) {
      handleVerify(digits);
    }
  }, [error]);

  async function handleVerify(otp: string) {
    if (verifying || !phone) return;
    setVerifying(true);
    setError(null);
    haptic('medium');

    // Start orbit animation
    startOrbit();

    // Verify with Supabase
    const { error: verifyError } = await verifyPhoneOtp(phone, otp);

    if (verifyError) {
      haptic('error');
      showError();
      // Wait for error animation to finish, then show error text
      setTimeout(() => {
        setError(t('phoneVerify.invalidCode'));
        setCode('');
        setVerifying(false);
        inputRef.current?.focus();
      }, 600);
    } else {
      haptic('success');
      showSuccess();
      setVerified(true);
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || !phone) return;
    haptic('light');
    const { error: resendError } = await sendPhoneOtp(phone);
    if (resendError) {
      setError(resendError);
    } else {
      showToast(t('phoneVerify.resendCode'));
      setResendTimer(RESEND_SECONDS);
      timerRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function handleContinue() {
    haptic('light');
    router.back();
    router.back(); // Go back past phone-verify too
  }

  // Digit box gap and layout
  const gap = 8;
  const digitSize = Math.min(DIGIT_SIZE, (containerWidth - gap * (DIGIT_COUNT - 1)) / DIGIT_COUNT);
  const totalWidth = DIGIT_COUNT * digitSize + (DIGIT_COUNT - 1) * gap;
  const startX = (containerWidth - totalWidth) / 2;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          {!verified ? (
            <>
              <ThemedText type="title" style={styles.title}>{t('phoneVerify.otpTitle')}</ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
                {t('phoneVerify.otpSubtitle', { phone: maskedPhone })}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="title" style={[styles.title, { color: colors.accent }]}>
                {t('phoneVerify.success')}
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
                {t('phoneVerify.successSubtitle')}
              </ThemedText>
            </>
          )}

          <ThemedView type="card" style={styles.card}>
            {/* Animation area */}
            <View style={[styles.animationArea, { height: ORBIT_RADIUS * 2 + digitSize + 40 }]}>
              {/* Orbit ring */}
              <Animated.View
                style={[
                  styles.orbitRing,
                  {
                    width: ORBIT_RADIUS * 2 + digitSize,
                    height: ORBIT_RADIUS * 2 + digitSize,
                    borderRadius: ORBIT_RADIUS + digitSize / 2,
                    borderColor: colors.backgroundElement,
                    left: containerWidth / 2 - ORBIT_RADIUS - digitSize / 2,
                    top: 20,
                  },
                  orbitRingStyle,
                ]}
              />

              {/* Center dot (visible during orbit) */}
              <Animated.View
                style={[
                  styles.centerDot,
                  {
                    backgroundColor: colors.textSecondary,
                    left: containerWidth / 2 - 3,
                    top: ORBIT_RADIUS + 20 + digitSize / 2 - 3,
                  },
                  orbitRingStyle,
                ]}
              />

              {/* Digit boxes */}
              {Array.from({ length: DIGIT_COUNT }).map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.digitBox,
                    {
                      width: digitSize,
                      height: digitSize + 8,
                      backgroundColor: code[i] ? colors.accent : colors.backgroundElement,
                      borderColor: code[i] ? colors.accent : colors.backgroundSelected,
                      left: startX + i * (digitSize + gap),
                      top: ORBIT_RADIUS + 20 + digitSize / 2 - (digitSize + 8) / 2,
                    },
                    digitStyles[i](),
                  ]}>
                  <ThemedText
                    type="subtitle"
                    style={{
                      color: code[i] ? colors.accentText : colors.textSecondary,
                      textAlign: 'center',
                    }}>
                    {code[i] ?? ''}
                  </ThemedText>
                </Animated.View>
              ))}

              {/* Success checkmark */}
              <Animated.View
                style={[
                  styles.checkmarkWrap,
                  {
                    left: containerWidth / 2 - 40,
                    top: ORBIT_RADIUS + 20 + digitSize / 2 - 40,
                  },
                  checkmarkStyle,
                ]}>
                <View style={[styles.checkmarkCircle, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={40} color={colors.accentText} />
                </View>
              </Animated.View>
            </View>

            {/* Hidden TextInput that captures keyboard */}
            {!verified && (
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={DIGIT_COUNT}
                autoFocus
                caretHidden
                style={styles.hiddenInput}
              />
            )}

            {/* Tap area to focus input */}
            {!verified && !verifying && (
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={StyleSheet.absoluteFill}
              />
            )}
          </ThemedView>

          {error && (
            <ThemedText type="small" themeColor="accent" style={styles.errorText}>{error}</ThemedText>
          )}

          {/* Resend / Continue */}
          {verified ? (
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.continueButton,
                { backgroundColor: colors.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: colors.accentText }}>
                {t('phoneVerify.continue')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.resendRow}>
              {resendTimer > 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('phoneVerify.resendIn', { seconds: resendTimer })}
                </ThemedText>
              ) : (
                <Pressable onPress={handleResend}>
                  <ThemedText type="smallBold" themeColor="accent">
                    {t('phoneVerify.resendCode')}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </View>
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    overflow: 'hidden',
  },
  animationArea: {
    position: 'relative',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  digitBox: {
    position: 'absolute',
    borderRadius: Radius.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkWrap: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorText: {
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
  },
  continueButton: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.85,
  },
});
