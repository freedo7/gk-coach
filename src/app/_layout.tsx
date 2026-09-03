import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';
import { PurchasesProvider } from '@/context/purchases-context';
import { ThemePreferenceProvider, useThemePreference } from '@/context/theme-context';
import { PushRegistrar } from '@/components/push-registrar';
import { ToastProvider } from '@/context/toast-context';

SplashScreen.preventAutoHideAsync();

const LightNav = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };
const DarkNav = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent' } };

function AppShell() {
  const { scheme } = useThemePreference();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkNav : LightNav}>
      <AuthProvider>
        <PurchasesProvider>
          <ToastProvider>
            <AnimatedSplashOverlay />
            <PushRegistrar />
            <Slot />
          </ToastProvider>
        </PurchasesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <AppShell />
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
