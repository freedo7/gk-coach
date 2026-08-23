import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccentGlow, Colors } from '@/constants/theme';

// Cerchio con alone colorato sfumato dietro (icone/azioni rapide in stile "glass glow").
export function GlowIcon({ children, size = 52 }: PropsWithChildren<{ size?: number }>) {
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.halo,
          { width: size * 1.6, height: size * 1.6, borderRadius: (size * 1.6) / 2 },
        ]}
      />
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, AccentGlow]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: Colors.light.accent,
    opacity: 0.18,
  },
  circle: {
    backgroundColor: Colors.light.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
