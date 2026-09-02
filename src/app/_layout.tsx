import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';
import { PurchasesProvider } from '@/context/purchases-context';
import { PushRegistrar } from '@/components/push-registrar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <PurchasesProvider>
          <AnimatedSplashOverlay />
          <PushRegistrar />
          <Slot />
        </PurchasesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
