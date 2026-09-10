import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { supabase } from '@/lib/supabase';
import { isValidEmail, isValidPassword, getPasswordChecks } from '@/lib/validation';
import { useLoginTransition } from '@/context/login-transition-context';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { LEGAL_URLS } from '@/constants/legal';

const PARALLAX_RANGE = 15;
const AnimatedImage = Animated.createAnimatedComponent(Image);

// ─── Parallax Background ───
function ParallaxBackground() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(50);
    const sub = Accelerometer.addListener(({ x, y }) => {
      tiltX.value = withTiming(x * PARALLAX_RANGE, { duration: 150 });
      tiltY.value = withTiming(y * PARALLAX_RANGE, { duration: 150 });
    });
    return () => sub.remove();
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value },
      { translateY: tiltY.value },
      { scale: 1.1 }, // slightly bigger to avoid edge gaps
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
      <Image
        source={require('@/assets/images/sfondo-dark.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />
    </Animated.View>
  );
}

// ─── Animated Logo with Glow ───
function AnimatedLogo({ keyboardOpen }: { keyboardOpen: boolean }) {
  const scale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Entry animation
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    // Pulsing glow
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Shrink when keyboard opens
  const targetScale = keyboardOpen ? 0.6 : 1;
  const animScale = useSharedValue(1);
  useEffect(() => {
    animScale.value = withSpring(targetScale, { damping: 15 });
  }, [targetScale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * animScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: scale.value * animScale.value * 1.8 }],
  }));

  return (
    <View style={styles.logoContainer}>
      <AnimatedImage
        source={require('@/assets/images/logo-glow.png')}
        style={[styles.logoGlow, glowStyle]}
        resizeMode="contain"
        tintColor="#6FC22C"
      />
      <AnimatedImage
        source={require('@/assets/images/gk-coach-logo.jpeg')}
        style={[styles.logo, logoStyle]}
        resizeMode="cover"
      />
    </View>
  );
}

// ─── Tab Selector (Accedi / Registrati) ───
function TabSelector({ active, onSwitch }: { active: 'login' | 'register'; onSwitch: (tab: 'login' | 'register') => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const indicatorLeft = useSharedValue(active === 'login' ? 0 : 50);

  useEffect(() => {
    indicatorLeft.value = withSpring(active === 'login' ? 0 : 50, { damping: 18, stiffness: 150 });
  }, [active]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${indicatorLeft.value}%` as any,
    width: '50%',
  }));

  return (
    <View style={[styles.tabRow, { backgroundColor: colors.backgroundElement }]}>
      <Animated.View style={[styles.tabIndicator, { backgroundColor: colors.accent }, indicatorStyle]} />
      <Pressable style={styles.tab} onPress={() => { haptic('light'); onSwitch('login'); }}>
        <ThemedText
          type="smallBold"
          style={{ color: active === 'login' ? colors.accentText : colors.textSecondary }}>
          {t('auth.loginButton')}
        </ThemedText>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => { haptic('light'); onSwitch('register'); }}>
        <ThemedText
          type="smallBold"
          style={{ color: active === 'register' ? colors.accentText : colors.textSecondary }}>
          {t('auth.registerButton')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

// ─── Animated Input with focus glow ───
function GlowInput({
  inputRef,
  placeholder,
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  returnKeyType,
  delay = 0,
  error,
  rightIcon,
}: {
  inputRef?: React.RefObject<TextInput>;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  autoComplete?: TextInput['props']['autoComplete'];
  returnKeyType?: TextInput['props']['returnKeyType'];
  delay?: number;
  error?: string | null;
  rightIcon?: React.ReactNode;
}) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue(0);

  useEffect(() => {
    borderColor.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const wrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(borderColor.value, [0, 1], [0, 1]) > 0.5
      ? 'rgba(111, 194, 44, 0.6)'
      : 'transparent',
    borderWidth: 1.5,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
      <Animated.View style={[styles.inputWrap, { backgroundColor: colors.backgroundElement }, wrapStyle]}>
        <TextInput
          ref={inputRef as any}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          style={[styles.input, { color: colors.text, fontFamily: Fonts.sansMedium }]}
        />
        {rightIcon}
      </Animated.View>
      {error && (
        <ThemedText type="small" style={styles.fieldError} themeColor="accent">{error}</ThemedText>
      )}
    </Animated.View>
  );
}

// ─── Animated Button ───
function PulseButton({
  label,
  onPress,
  disabled,
  loading,
  delay = 0,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  delay?: number;
}) {
  const colors = useTheme();
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!disabled && !loading) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [disabled, loading]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()} style={buttonStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent },
          disabled && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}>
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <ThemedText type="smallBold" style={{ color: colors.accentText }}>{label}</ThemedText>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Login Form ───
function LoginForm() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const colors = useTheme();
  const { trigger: triggerTransition } = useLoginTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  // true solo quando un campo viene riempito in un colpo solo (autofill / incolla),
  // non durante la digitazione manuale (+1 carattere per volta).
  const filledByAutofill = useRef(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  // Chiude la tastiera solo dopo un autofill che popola entrambi i campi
  useEffect(() => {
    if (!filledByAutofill.current) return;
    if (email.trim().length > 0 && password.length > 0) {
      filledByAutofill.current = false;
      const timer = setTimeout(() => Keyboard.dismiss(), 100);
      return () => clearTimeout(timer);
    }
  }, [email, password]);

  async function handleSubmit() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    haptic('medium');
    setError(null);
    setSubmitting(true);
    const { error: e } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (e) { haptic('error'); setError(e); }
    else {
      haptic('success');
      // Try to get the user's full name for the welcome message
      const { data: { user } } = await supabase.auth.getUser();
      let name = email.split('@')[0];
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (prof?.full_name) name = prof.full_name.split(' ')[0];
      }
      triggerTransition(name);
    }
  }

  return (
    <>
      <GlowInput
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={(v) => { if (v.length - email.length > 1) filledByAutofill.current = true; setEmail(v); if (emailError) setEmailError(null); }}
        onBlur={() => { if (email.trim() && !isValidEmail(email)) setEmailError(t('auth.emailInvalid')); else setEmailError(null); }}
        onSubmitEditing={() => passwordRef.current?.focus()}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        delay={100}
        error={emailError}
      />
      <GlowInput
        inputRef={passwordRef}
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChangeText={(v) => { if (v.length - password.length > 1) filledByAutofill.current = true; setPassword(v); if (passwordError) setPasswordError(null); }}
        onBlur={() => { if (password && !isValidPassword(password)) setPasswordError(t('auth.passwordTooShort')); else setPasswordError(null); }}
        onSubmitEditing={handleSubmit}
        secureTextEntry={!showPassword}
        autoComplete="password"
        returnKeyType="go"
        delay={200}
        error={passwordError}
        rightIcon={
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        }
      />

      <Animated.View entering={FadeInDown.delay(250).duration(300)}>
        <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
          <ThemedText type="small" themeColor="accent">{t('auth.forgotPassword')}</ThemedText>
        </Link>
      </Animated.View>

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <ThemedText type="small" themeColor="accent">{error}</ThemedText>
        </Animated.View>
      )}

      <PulseButton
        label={t('auth.loginButton')}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
        delay={300}
      />
    </>
  );
}

// ─── Register Form ───
function RegisterForm() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const colors = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'preparatore' | 'portiere'>('preparatore');
  const [inviteCode, setInviteCode] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPwRef = useRef<TextInput>(null);

  const passwordsMatch = password === confirmPassword;
  const canSubmit = fullName.trim().length > 0 && isValidEmail(email) && isValidPassword(password) && passwordsMatch && confirmPassword.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    haptic('medium');
    setError(null);
    setSubmitting(true);
    const { error: e } = await signUp(email.trim(), password, fullName, role, role === 'portiere' && inviteCode.trim() ? inviteCode.trim() : undefined);
    setSubmitting(false);
    if (e) { haptic('error'); setError(e); }
    else { haptic('success'); setDone(true); }
  }

  if (done) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.successWrap}>
        <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        <ThemedText style={styles.successText}>{t('auth.registerSuccess')}</ThemedText>
      </Animated.View>
    );
  }

  return (
    <>
      <GlowInput
        placeholder={t('auth.fullNamePlaceholder')}
        value={fullName}
        onChangeText={setFullName}
        onSubmitEditing={() => emailRef.current?.focus()}
        autoComplete="name"
        returnKeyType="next"
        delay={100}
      />
      <GlowInput
        inputRef={emailRef}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); }}
        onBlur={() => { if (email.trim() && !isValidEmail(email)) setEmailError(t('auth.emailInvalid')); else setEmailError(null); }}
        onSubmitEditing={() => passwordRef.current?.focus()}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        delay={200}
        error={emailError}
      />
      <GlowInput
        inputRef={passwordRef}
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); }}
        onBlur={() => { if (password && !isValidPassword(password)) setPasswordError(t('auth.passwordTooShort')); else setPasswordError(null); }}
        onSubmitEditing={() => confirmPwRef.current?.focus()}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        returnKeyType="next"
        delay={300}
        error={passwordError}
        rightIcon={
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        }
      />

      {password.length > 0 && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.pwRequirements}>
          {([
            ['minLength', t('auth.pwReqLength')] as const,
            ['uppercase', t('auth.pwReqUppercase')] as const,
            ['special', t('auth.pwReqSpecial')] as const,
          ]).map(([key, label]) => {
            const met = getPasswordChecks(password)[key];
            return (
              <View key={key} style={styles.pwReqRow}>
                <Ionicons
                  name={met ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={met ? colors.accent : colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: met ? colors.accent : colors.textSecondary }}>
                  {label}
                </ThemedText>
              </View>
            );
          })}
        </Animated.View>
      )}

      <GlowInput
        inputRef={confirmPwRef}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        returnKeyType="done"
        delay={350}
        error={confirmPassword.length > 0 && !passwordsMatch ? t('auth.passwordMismatch') : null}
        rightIcon={
          confirmPassword.length > 0 ? (
            <View style={styles.eyeButton}>
              <Ionicons
                name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={passwordsMatch ? colors.accent : '#ef4444'}
              />
            </View>
          ) : undefined
        }
      />

      <Animated.View entering={FadeInDown.delay(400).duration(300)}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginBottom: Spacing.one }}>
          {t('auth.youAre')}
        </ThemedText>
        <View style={styles.roleRow}>
          <Pressable
            onPress={() => { haptic('light'); setRole('preparatore'); }}
            style={[styles.roleButton, { backgroundColor: role === 'preparatore' ? colors.accent : colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ color: role === 'preparatore' ? colors.accentText : colors.textSecondary }}>
              {t('auth.coach')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => { haptic('light'); setRole('portiere'); }}
            style={[styles.roleButton, { backgroundColor: role === 'portiere' ? colors.accent : colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ color: role === 'portiere' ? colors.accentText : colors.textSecondary }}>
              {t('auth.goalkeeper')}
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      {role === 'portiere' && (
        <GlowInput
          placeholder={t('auth.teamCodePlaceholder')}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          delay={0}
        />
      )}

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <ThemedText type="small" themeColor="accent">{error}</ThemedText>
        </Animated.View>
      )}

      <PulseButton
        label={t('auth.registerButton')}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
        delay={500}
      />

      <Animated.View entering={FadeInDown.delay(550).duration(300)}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.legalText}>
          {t('auth.legalPrefix')}{' '}
          <ThemedText type="small" themeColor="accent" onPress={() => Linking.openURL(LEGAL_URLS.terms)}>
            {t('auth.legalTerms')}
          </ThemedText>
          {' '}{t('auth.legalAnd')}{' '}
          <ThemedText type="small" themeColor="accent" onPress={() => Linking.openURL(LEGAL_URLS.privacy)}>
            {t('auth.legalPrivacy')}
          </ThemedText>.
        </ThemedText>
      </Animated.View>
    </>
  );
}

// ─── Main Auth Screen ───
export function AuthScreen({ initialTab = 'login' }: { initialTab?: 'login' | 'register' }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  return (
    <View style={styles.container}>
      <ParallaxBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: screenH, paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}>
          <View style={styles.safeArea}>
            <AnimatedLogo keyboardOpen={keyboardOpen} />

            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <ThemedText type="subtitle" themeColor="textSecondary" style={styles.subtitle}>
                {activeTab === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
              </ThemedText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <TabSelector active={activeTab} onSwitch={setActiveTab} />
              <View style={styles.formContent}>
                {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111214',
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
  logoContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: Radius.card,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: 'rgba(28, 29, 33, 0.85)',
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: Radius.control,
    margin: Spacing.three,
    marginBottom: 0,
  },
  tabIndicator: {
    position: 'absolute',
    height: '100%',
    borderRadius: Radius.control,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  formContent: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: Spacing.three,
  },
  fieldError: {
    marginTop: Spacing.half,
    marginLeft: Spacing.one,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.one,
  },
  legalText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  pwRequirements: {
    gap: Spacing.one,
    marginTop: -Spacing.one,
  },
  pwReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
  successWrap: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  successText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
