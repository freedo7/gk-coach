import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="allenamenti"
        options={{
          title: 'Allenamenti',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="partite"
        options={{
          title: 'Partite',
          tabBarIcon: ({ color }) => (
            <Ionicons name="football-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistiche"
        options={{
          title: 'Statistiche',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bar-chart-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: 'Impostazioni',
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="esercizi" options={{ href: null }} />
    </Tabs>
  );
}
