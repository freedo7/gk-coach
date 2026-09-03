import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabIconWrapper}>
      <Ionicons name={name as any} size={28} color={color} />
      <View style={[styles.dot, { backgroundColor: focused ? colors.accent : 'transparent' }]} />
    </View>
  );
}

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
          title: 'Allenamenti',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="partite"
        options={{
          title: 'Partite',
          tabBarIcon: ({ color, focused }) => <TabIcon name="football-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="statistiche"
        options={{
          title: 'Statistiche',
          tabBarIcon: ({ color, focused }) => <TabIcon name="bar-chart-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: 'Impostazioni',
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
});
