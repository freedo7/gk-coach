import { useThemePreference } from '@/context/theme-context';

export function useColorScheme() {
  const { scheme } = useThemePreference();
  return scheme;
}
