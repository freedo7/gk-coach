import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { listMatches } from '@/lib/api/matches';
import { listTrainings } from '@/lib/api/trainings';
import { haptic } from '@/hooks/use-haptic';

const HIDDEN_TABS = new Set(['esercizi']);
const PILL_H = 46;
const SPRING_CFG = { damping: 16, stiffness: 180, mass: 0.8 };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useHasEventsToday(teamId: string | undefined): boolean {
  const [has, setHas] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!teamId) return;
      const today = todayISO();
      let cancelled = false;
      (async () => {
        try {
          const [trainings, matches] = await Promise.all([
            listTrainings(teamId),
            listMatches(teamId),
          ]);
          if (cancelled) return;
          setHas(
            trainings.some((t) => t.training_date === today) ||
            matches.some((m) => m.match_date === today),
          );
        } catch { /* ignore */ }
      })();
      return () => { cancelled = true; };
    }, [teamId]),
  );
  return has;
}

const TAB_ICONS: Record<string, string> = {
  index: 'home-outline',
  allenamenti: 'calendar-outline',
  partite: 'football-outline',
  statistiche: 'bar-chart-outline',
  profilo: 'settings-outline',
};
const TAB_ICONS_FILLED: Record<string, string> = {
  index: 'home',
  allenamenti: 'calendar',
  partite: 'football',
  statistiche: 'bar-chart',
  profilo: 'settings',
};

function TabIcon({
  iconOutline,
  iconFilled,
  focused,
  badge,
  accentColor,
}: {
  iconOutline: string;
  iconFilled: string;
  focused: boolean;
  badge?: boolean;
  accentColor: string;
}) {
  const pillScale = useSharedValue(focused ? 1 : 0);
  const pillOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    pillScale.value = withSpring(focused ? 1 : 0, SPRING_CFG);
    pillOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scaleX: 0.5 + pillScale.value * 0.5 }, { scaleY: 0.5 + pillScale.value * 0.5 }],
  }));

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={[styles.pill, { backgroundColor: accentColor }, pillStyle]} />
      <View style={styles.iconInner}>
        <Ionicons
          name={(focused ? iconFilled : iconOutline) as any}
          size={24}
          color={focused ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
        />
        {badge && <View style={styles.badge} />}
      </View>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { currentTeam } = useAuth();
  const hasEventsToday = useHasEventsToday(currentTeam?.id);

  const visibleRoutes = state.routes.filter((r) => !HIDDEN_TABS.has(r.name));
  const visibleIndex = visibleRoutes.findIndex((r) => r.key === state.routes[state.index].key);
  const activeVisible = visibleIndex >= 0;

  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]}>
      <View
        style={[
          styles.bar,
          { backgroundColor: scheme === 'dark' ? 'rgba(30,31,36,0.94)' : 'rgba(245,245,248,0.96)' },
        ]}
      >
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = activeVisible && visibleIndex === index;
          const iconOutline = TAB_ICONS[route.name] ?? 'ellipse-outline';
          const iconFilled = TAB_ICONS_FILLED[route.name] ?? 'ellipse';
          const badge = route.name === 'allenamenti' && hasEventsToday;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (ev.defaultPrevented) return;
                if (!focused) {
                  haptic('light');
                  navigation.navigate(route.name, route.params);
                } else {
                  // Already on this tab — reset to root screen instantly
                  navigation.reset({
                    index: 0,
                    routes: [{ name: route.name }],
                  });
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              style={styles.tab}
            >
              <TabIcon
                iconOutline={iconOutline}
                iconFilled={iconFilled}
                focused={focused}
                badge={badge}
                accentColor={colors.accent}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="allenamenti" options={{ title: t('tabs.trainings') }} />
      <Tabs.Screen name="partite" options={{ title: t('tabs.matches') }} />
      <Tabs.Screen name="statistiche" options={{ title: t('tabs.stats') }} />
      <Tabs.Screen name="profilo" options={{ title: t('tabs.settings') }} />
      <Tabs.Screen name="esercizi" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_H,
  },
  tabIconWrap: {
    width: PILL_H,
    height: PILL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: PILL_H,
    height: PILL_H,
    borderRadius: PILL_H / 2,
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
});
