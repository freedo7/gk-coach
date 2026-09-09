import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
  type AnimatedStyle,
} from 'react-native-reanimated';

const DIGIT_COUNT = 6;
const ORBIT_RADIUS = 80;
const ORBIT_DURATION = 2000;
const DIGIT_SIZE = 48;

// Positions of digits in the row layout (centered in container)
function getGridPosition(index: number, containerWidth: number): { x: number; y: number } {
  const gap = 12;
  const totalWidth = DIGIT_COUNT * DIGIT_SIZE + (DIGIT_COUNT - 1) * gap;
  const startX = (containerWidth - totalWidth) / 2;
  const x = startX + index * (DIGIT_SIZE + gap);
  const y = 0; // relative to digit row
  return { x, y };
}

// Positions of digits on the orbit circle
function getOrbitPosition(index: number, angle: number, centerX: number, centerY: number): { x: number; y: number } {
  const digitAngle = angle + (index * 2 * Math.PI) / DIGIT_COUNT;
  return {
    x: centerX + ORBIT_RADIUS * Math.cos(digitAngle) - DIGIT_SIZE / 2,
    y: centerY + ORBIT_RADIUS * Math.sin(digitAngle) - DIGIT_SIZE / 2,
  };
}

export type OtpPhase = 'entry' | 'orbiting' | 'success' | 'error';

export function useOtpAnimation(containerWidth: number) {
  // 0 = entry, 1 = orbiting, 2 = success, 3 = error
  const phase = useSharedValue(0);
  const orbitAngle = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);

  // Per-digit shared values for custom positioning
  const digitOffsetX = Array.from({ length: DIGIT_COUNT }, () => useSharedValue(0));
  const digitOffsetY = Array.from({ length: DIGIT_COUNT }, () => useSharedValue(0));
  const digitScale = Array.from({ length: DIGIT_COUNT }, () => useSharedValue(1));
  const digitOpacity = Array.from({ length: DIGIT_COUNT }, () => useSharedValue(1));

  const centerX = containerWidth / 2 - DIGIT_SIZE / 2;
  const centerY = ORBIT_RADIUS + 20; // some padding from top

  const startOrbit = useCallback(() => {
    'worklet';
    phase.value = 1;

    // Animate digits from grid to orbit positions
    for (let i = 0; i < DIGIT_COUNT; i++) {
      const grid = getGridPosition(i, containerWidth);
      const orbitPos = getOrbitPosition(i, 0, centerX, centerY);
      digitOffsetX[i].value = withTiming(orbitPos.x - grid.x, { duration: 400, easing: Easing.out(Easing.cubic) });
      digitOffsetY[i].value = withTiming(orbitPos.y, { duration: 400, easing: Easing.out(Easing.cubic) });
    }

    // Start orbit rotation
    orbitAngle.value = 0;
    orbitAngle.value = withRepeat(
      withTiming(2 * Math.PI, { duration: ORBIT_DURATION, easing: Easing.linear }),
      -1, // infinite
      false
    );
  }, [containerWidth, centerX, centerY]);

  const showSuccess = useCallback(() => {
    phase.value = 2;
    cancelAnimation(orbitAngle);

    // Collapse digits to center
    for (let i = 0; i < DIGIT_COUNT; i++) {
      const grid = getGridPosition(i, containerWidth);
      digitOffsetX[i].value = withTiming(centerX - grid.x, { duration: 300 });
      digitOffsetY[i].value = withTiming(centerY, { duration: 300 });
      digitScale[i].value = withTiming(0, { duration: 300 });
      digitOpacity[i].value = withTiming(0, { duration: 250 });
    }

    // Show checkmark after collapse
    checkmarkScale.value = withDelay(350, withSpring(1, { damping: 12, stiffness: 150 }));
    checkmarkOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
  }, [containerWidth, centerX, centerY]);

  const showError = useCallback(() => {
    phase.value = 3;
    cancelAnimation(orbitAngle);

    // Return digits to grid and shake
    for (let i = 0; i < DIGIT_COUNT; i++) {
      digitOffsetX[i].value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      digitOffsetY[i].value = withTiming(0, { duration: 200 });
      digitScale[i].value = withTiming(1, { duration: 200 });
      digitOpacity[i].value = withTiming(1, { duration: 200 });
    }

    // Reset phase after shake
    phase.value = withDelay(500, withTiming(0, { duration: 0 }));
  }, []);

  const reset = useCallback(() => {
    phase.value = 0;
    cancelAnimation(orbitAngle);
    orbitAngle.value = 0;
    checkmarkScale.value = 0;
    checkmarkOpacity.value = 0;
    for (let i = 0; i < DIGIT_COUNT; i++) {
      digitOffsetX[i].value = 0;
      digitOffsetY[i].value = 0;
      digitScale[i].value = 1;
      digitOpacity[i].value = 1;
    }
  }, []);

  // Generate animated styles for each digit
  const digitStyles: (() => AnimatedStyle)[] = [];
  for (let i = 0; i < DIGIT_COUNT; i++) {
    const idx = i;
    digitStyles.push(
      useAnimatedStyle(() => {
        // During orbit, update positions based on orbitAngle
        if (phase.value === 1) {
          const grid = getGridPosition(idx, containerWidth);
          const orbitPos = getOrbitPosition(idx, orbitAngle.value, centerX, centerY);
          return {
            transform: [
              { translateX: orbitPos.x - grid.x },
              { translateY: orbitPos.y },
              { scale: digitScale[idx].value },
            ],
            opacity: digitOpacity[idx].value,
          };
        }

        return {
          transform: [
            { translateX: digitOffsetX[idx].value },
            { translateY: digitOffsetY[idx].value },
            { scale: digitScale[idx].value },
          ],
          opacity: digitOpacity[idx].value,
        };
      })
    );
  }

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  // Orbit ring style (circle that connects the digits)
  const orbitRingStyle = useAnimatedStyle(() => ({
    opacity: phase.value === 1 ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 200 }),
    transform: [{ rotate: `${orbitAngle.value}rad` }],
  }));

  return {
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
  };
}
