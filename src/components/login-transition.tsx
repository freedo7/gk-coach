import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useLoginTransition } from '@/context/login-transition-context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Radius } from '@/constants/theme';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function LoginTransitionOverlay() {
  const { active, userName, finish } = useLoginTransition();
  const { t } = useTranslation();
  const colors = useTheme();

  const overlayOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(15);

  useEffect(() => {
    if (!active) return;

    // Phase 1: Overlay fades in + logo zooms
    overlayOpacity.value = withTiming(1, { duration: 200 });
    logoScale.value = withSpring(1.1, { damping: 10, stiffness: 120 });

    // Phase 2: Glow pulse
    glowOpacity.value = withDelay(150, withTiming(0.8, { duration: 300 }));
    glowScale.value = withDelay(150,
      withSequence(
        withTiming(2.2, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(1.8, { duration: 300 }),
      )
    );

    // Phase 3: Welcome text
    textOpacity.value = withDelay(350, withTiming(1, { duration: 300 }));
    textTranslateY.value = withDelay(350, withSpring(0, { damping: 14 }));

    // Phase 4: Everything fades out
    const fadeOutDelay = 2000;
    overlayOpacity.value = withDelay(fadeOutDelay, withTiming(0, { duration: 400 }, (done) => {
      if (done) runOnJS(finish)();
    }));
    logoScale.value = withDelay(fadeOutDelay, withTiming(1.5, { duration: 400 }));
    glowOpacity.value = withDelay(fadeOutDelay, withTiming(0, { duration: 300 }));
    textOpacity.value = withDelay(fadeOutDelay, withTiming(0, { duration: 250 }));
  }, [active]);

  // Reset values when not active
  useEffect(() => {
    if (active) return;
    overlayOpacity.value = 0;
    logoScale.value = 0.8;
    glowOpacity.value = 0;
    glowScale.value = 1;
    textOpacity.value = 0;
    textTranslateY.value = 15;
  }, [active]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' as const : 'none' as const,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const displayName = userName || '';

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <View style={styles.center}>
        {/* Glow behind logo */}
        <AnimatedImage
          source={require('@/assets/images/logo-glow.png')}
          style={[styles.glow, glowStyle]}
          resizeMode="contain"
          tintColor="#6FC22C"
        />
        {/* Logo */}
        <AnimatedImage
          source={require('@/assets/images/gk-coach-logo.jpeg')}
          style={[styles.logo, logoStyle]}
          resizeMode="cover"
        />
      </View>

      {/* Welcome text */}
      <Animated.Text
        style={[
          styles.welcomeText,
          { color: colors.text, fontFamily: Fonts.sansSemiBold },
          textStyle,
        ]}>
        {t('auth.welcomeBack', { name: displayName })}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(17, 18, 20, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: Radius.card,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
  },
  welcomeText: {
    marginTop: 32,
    fontSize: 20,
    textAlign: 'center',
  },
});
