import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { listMatches } from '@/lib/api/matches';
import { listTrainings } from '@/lib/api/trainings';

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
          const found =
            trainings.some((t) => t.training_date === today) ||
            matches.some((m) => m.match_date === today);
          setHas(found);
        } catch {
          // ignore – badge just won't show
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [teamId]),
  );

  return has;
}

function TabIcon({
  name,
  color,
  focused,
  badge,
}: {
  name: string;
  color: string;
  focused: boolean;
  badge?: boolean;
}) {
  const colors = useTheme();
  return (
    <View style={styles.tabIconWrapper}>
      <View>
        <Ionicons name={name as any} size={28} color={color} />
        {badge && <View style={styles.badge} />}
      </View>
      <View style={[styles.dot, { backgroundColor: focused ? colors.accent : 'transparent' }]} />
    </View>
  );
}

export default function AppTabs() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { currentTeam } = useAuth();
  const hasEventsToday = useHasEventsToday(currentTeam?.id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          elevation: 0,
          height: 80,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="allenamenti"
        options={{
          title: t('tabs.trainings'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" color={color} focused={focused} badge={hasEventsToday} />
          ),
        }}
      />
      <Tabs.Screen
        name="partite"
        options={{
          title: t('tabs.matches'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="football-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="statistiche"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="bar-chart-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="settings-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen name="esercizi" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});
