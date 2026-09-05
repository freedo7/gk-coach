import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemePreference = 'auto' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** The resolved scheme actually in use */
  scheme: 'light' | 'dark';
}

const STORAGE_KEY = 'gk_theme_preference';

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'auto',
  setPreference: () => {},
  scheme: 'light',
});

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'auto') {
        setPreferenceState(val);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const scheme: 'light' | 'dark' = preference === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ preference, setPreference, scheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
