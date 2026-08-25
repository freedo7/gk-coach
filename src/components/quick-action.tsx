import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { GlowIcon } from '@/components/glow-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  href: ComponentProps<typeof Link>['href'];
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export function QuickAction({ href, icon, label }: Props) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
        <GlowIcon>
          <Ionicons name={icon} size={30} color={Colors.light.accent} />
        </GlowIcon>
        <ThemedText type="small" style={styles.label}>
          {label}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
});
