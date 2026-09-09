import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('screen');

interface TransitionContextValue {
  containerRef: React.RefObject<Animated.View>;
  transitionTo: (applyChange: () => void) => Promise<void>;
}

const TransitionContext = createContext<TransitionContextValue>({
  containerRef: { current: null },
  transitionTo: async () => {},
});

export function useScreenTransition() {
  return useContext(TransitionContext);
}

export function ScreenTransitionProvider({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<Animated.View>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const overlayOpacity = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' as const : 'none' as const,
  }));

  const transitionTo = useCallback(async (applyChange: () => void) => {
    try {
      const uri = await captureRef(containerRef, {
        format: 'jpg',
        quality: 0.85,
        result: 'tmpfile',
      });

      setSnapshotUri(uri);
      overlayOpacity.value = 1;

      // Apply the actual change — theme/language re-render happens underneath
      applyChange();

      // Next frame: start fading out the snapshot
      requestAnimationFrame(() => {
        overlayOpacity.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        // Clean up snapshot after animation
        setTimeout(() => setSnapshotUri(null), 600);
      });
    } catch {
      // Fallback: just apply the change without animation
      applyChange();
    }
  }, []);

  return (
    <TransitionContext.Provider value={{ containerRef, transitionTo }}>
      <Animated.View ref={containerRef} style={styles.container} collapsable={false}>
        {children}
      </Animated.View>

      <Animated.View style={[styles.overlay, overlayStyle]}>
        {snapshotUri && (
          <Image
            source={{ uri: snapshotUri }}
            style={styles.snapshot}
            resizeMode="cover"
          />
        )}
      </Animated.View>
    </TransitionContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 9998,
    elevation: 9998,
  },
  snapshot: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
});
