import { Tabs } from 'expo-router';
import { Image } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.accent,
        tabBarInactiveTintColor: '#333333',
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          elevation: 0,
        },
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{
                width: 28,
                height: 28,
                tintColor: focused ? Colors.light.accent : '#333333',
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
                width: 28,
                height: 28,
                tintColor: focused ? Colors.light.accent : '#333333',
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
