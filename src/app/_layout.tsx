import { useEffect } from 'react';
import { DefaultTheme, DarkTheme, ThemeProvider, Slot } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/lib/i18n';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';
import { PurchasesProvider } from '@/context/purchases-context';
import { ThemePreferenceProvider, useThemePreference } from '@/context/theme-context';
import { PushRegistrar } from '@/components/push-registrar';
import { ToastProvider } from '@/context/toast-context';
import { LoginTransitionProvider } from '@/context/login-transition-context';
import { LoginTransitionOverlay } from '@/components/login-transition';
import { ScreenTransitionProvider } from '@/components/theme-transition';

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
            <LoginTransitionProvider>
              <ScreenTransitionProvider>
                <AnimatedSplashOverlay />
                <PushRegistrar />
                <Slot />
                <LoginTransitionOverlay />
              </ScreenTransitionProvider>
            </LoginTransitionProvider>
          </ToastProvider>
        </PurchasesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <AppShell />
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
