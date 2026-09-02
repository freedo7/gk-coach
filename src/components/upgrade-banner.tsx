import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface Props {
  message?: string;
}

export function UpgradeBanner({ message = 'Funzionalità disponibile nel piano Pro' }: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={18} color={Colors.light.accentText} />
      <ThemedText type="small" style={styles.message}>{message}</ThemedText>
      <Pressable
        onPress={() => router.push('/profilo/paywall')}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
        <ThemedText type="smallBold" style={styles.btnText}>Passa a Pro</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  message: {
    flex: 1,
    color: Colors.light.accentText,
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  btnText: {
    color: Colors.light.accentText,
    fontSize: 12,
  },
});
