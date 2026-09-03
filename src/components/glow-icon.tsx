import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccentGlow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Cerchio con alone colorato sfumato dietro (icone/azioni rapide in stile "glass glow").
export function GlowIcon({ children, size = 64 }: PropsWithChildren<{ size?: number }>) {
  const colors = useTheme();
  const outerSize = size * 1.6;
  return (
    <View style={[styles.wrapper, { width: outerSize, height: outerSize }]}>
      <View
        style={[
          styles.halo,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2, backgroundColor: colors.accent },
        ]}
      />
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft }, AccentGlow]}>
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
    opacity: 0.10,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
