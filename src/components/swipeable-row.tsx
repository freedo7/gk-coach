import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/hooks/use-haptic';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
  confirmTitle?: string;
  confirmMessage?: string;
  enabled?: boolean;
}

export function SwipeableRow({ children, onDelete, confirmTitle = 'Eliminare?', confirmMessage, enabled = true }: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  function handleDeletePress() {
    haptic('warning');
    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Annulla', style: 'cancel', onPress: () => swipeableRef.current?.close() },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          swipeableRef.current?.close();
          await onDelete();
        },
      },
    ]);
  }

  function renderRightActions() {
    return (
      <Pressable onPress={handleDeletePress} style={styles.deleteAction}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.deleteText}>Elimina</Text>
      </Pressable>
    );
  }

  if (!enabled) return <>{children}</>;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    backgroundColor: Colors.light.danger,
    borderRadius: Radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginLeft: Spacing.one,
    gap: 2,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
