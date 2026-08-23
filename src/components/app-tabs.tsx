import { Tabs } from 'expo-router';
import { Image } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.accent,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.light.card,
          borderTopColor: Colors.light.backgroundElement,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{
                width: 22,
                height: 22,
                tintColor: focused ? Colors.light.accent : Colors.light.textSecondary,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{
                width: 22,
                height: 22,
                tintColor: focused ? Colors.light.accent : Colors.light.textSecondary,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen name="esercizi" options={{ href: null }} />
      <Tabs.Screen name="allenamenti" options={{ href: null }} />
      <Tabs.Screen name="partite" options={{ href: null }} />
    </Tabs>
  );
}
