import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface Props {
  message?: string;
}

export function UpgradeBanner({ message = 'Funzionalità disponibile nel piano Pro' }: Props) {
  const router = useRouter();
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.accent }]}>
      <Ionicons name="lock-closed-outline" size={18} color={colors.accentText} />
      <ThemedText type="small" style={[styles.message, { color: colors.accentText }]}>{message}</ThemedText>
      <Pressable
        onPress={() => router.push('/profilo/paywall')}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
        <ThemedText type="smallBold" style={[styles.btnText, { color: colors.accentText }]}>Passa a Pro</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  message: {
    flex: 1,
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  btnText: {
    fontSize: 12,
  },
});
