import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { profile } = useAuth();
  const name = profile?.full_name?.trim() || profile?.email || '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Ciao{name ? `, ${name}` : ''}</ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary">
          Prossimo allenamento e prossima partita arriveranno qui a breve.
        </ThemedText>

        <ThemedView type="card" style={styles.card}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            In arrivo
          </ThemedText>
          <ThemedText>
            Calendario allenamenti, libreria esercizi e calendario partite saranno disponibili
            nelle prossime tab.
          </ThemedText>
        </ThemedView>
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
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
