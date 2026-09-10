import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SectionLabelProps = {
  children: React.ReactNode;
  // Stile di layout applicato al contenitore (margini ecc.), come veniva
  // passato prima a ThemedText via styles.sectionTitle.
  style?: StyleProp<ViewStyle>;
};

// Etichetta "eyebrow" (es. PROSSIMA PARTITA) mostrata sopra alle card, spesso
// sovrapposta direttamente allo sfondo fotografico dell'app. Il testo vive
// dentro un piccolo "chip" con sfondo semi-opaco: look sobrio ma sempre
// staccato dallo sfondo, qualunque sia la zona (nero o fumo chiaro) su cui cade.
export function SectionLabel({ children, style }: SectionLabelProps) {
  const scheme = useColorScheme();
  const chipColor = scheme === 'dark' ? 'rgba(18,19,21,0.72)' : 'rgba(255,255,255,0.82)';

  return (
    <View style={[styles.wrap, { backgroundColor: chipColor }, style]}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.text}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
