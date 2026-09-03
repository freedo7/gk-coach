import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: Props) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={40} color={colors.accent} />
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
