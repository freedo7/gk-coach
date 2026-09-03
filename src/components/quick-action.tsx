import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { GlowIcon } from '@/components/glow-icon';
import { ThemedText } from '@/components/themed-text';
import { haptic } from '@/hooks/use-haptic';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface Props {
  href: ComponentProps<typeof Link>['href'];
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export function QuickAction({ href, icon, label }: Props) {
  const colors = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Link href={href} asChild>
      <Pressable
        style={styles.wrapper}
        onPressIn={() => { haptic('light'); scale.value = withSpring(1.3, { damping: 10, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 300 }); }}
      >
        <Animated.View style={[styles.inner, animatedStyle]}>
          <GlowIcon>
            <Ionicons name={icon} size={30} color={colors.accent} />
          </GlowIcon>
          <ThemedText type="small" style={styles.label}>
            {label}
          </ThemedText>
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
