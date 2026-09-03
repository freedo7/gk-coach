import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={40} color={Colors.light.accent} />
      </View>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      {subtitle && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
