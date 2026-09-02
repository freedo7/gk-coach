import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export function usePushNotifications() {
  const { session } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!session || registered.current) return;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        if (!Device.isDevice) return; // Simulatore — skip

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        // Android: canale di notifica
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        // Salva il token nel DB (upsert per evitare duplicati)
        await supabase.from('push_tokens').upsert(
          { profile_id: session.user.id, token },
          { onConflict: 'profile_id,token' },
        );

        registered.current = true;
      } catch {
        // expo-notifications non disponibile (Expo Go senza dev client) — ignora
      }
    })();
  }, [session?.user.id]);
}
