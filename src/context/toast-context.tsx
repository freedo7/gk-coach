import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const COLORS: Record<ToastType, { bg: string; text: string }> = {
    success: { bg: colors.accent, text: '#fff' },
    error: { bg: colors.danger, text: '#fff' },
    info: { bg: colors.card, text: colors.text },
  };

  const show = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setToast({ message, type });
      translateY.setValue(-100);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }).start();

      timeoutRef.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 2500);
    },
    [translateY]
  );

  const toastColors = toast ? COLORS[toast.type] : COLORS.success;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            { top: insets.top + Spacing.two, backgroundColor: toastColors.bg, transform: [{ translateY }] },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.text, { color: toastColors.text }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
