import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

export default function ProfiloScreen() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Profilo</ThemedText>

        <ThemedView type="card" style={styles.card}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Nome
          </ThemedText>
          <ThemedText>{profile?.full_name || '—'}</ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>
            Email
          </ThemedText>
          <ThemedText>{profile?.email}</ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>
            Ruolo
          </ThemedText>
          <ThemedText>{isAdmin ? 'Preparatore (admin)' : 'Portiere'}</ThemedText>
        </ThemedView>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            Esci
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
  },
  fieldSpacing: {
    marginTop: Spacing.three,
  },
  button: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.light.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
