import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 700;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const fadeOut = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    40: {
      transform: [{ scale: 1.05 }],
      opacity: 1,
      easing: Easing.out(Easing.ease),
    },
    100: {
      transform: [{ scale: 0.9 }],
      opacity: 0,
      easing: Easing.in(Easing.ease),
    },
  });

  const image = (
    <Image
      style={styles.logo}
      source={require('@/assets/images/gk-coach-logo.jpeg')}
      contentFit="contain"
    />
  );

  return animate ? (
    <Animated.View
      entering={fadeOut.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 220,
    height: 220,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
