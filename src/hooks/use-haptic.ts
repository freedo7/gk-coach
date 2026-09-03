import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const STYLE_MAP: Record<HapticStyle, () => void> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export function haptic(style: HapticStyle = 'light') {
  STYLE_MAP[style]();
}

export function useHaptic(style: HapticStyle = 'light') {
  return useCallback(() => STYLE_MAP[style](), [style]);
}
