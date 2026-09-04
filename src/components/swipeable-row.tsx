import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { haptic } from '@/hooks/use-haptic';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
  confirmTitle?: string;
  confirmMessage?: string;
  enabled?: boolean;
}

export function SwipeableRow({ children, onDelete, confirmTitle, confirmMessage, enabled = true }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const resolvedConfirmTitle = confirmTitle ?? t('components.deleteConfirmDefault');

  function handleDeletePress() {
    haptic('warning');
    Alert.alert(resolvedConfirmTitle, confirmMessage, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => swipeableRef.current?.close() },
      {
        text: t('common.delete'),
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
      <Pressable onPress={handleDeletePress} style={[styles.deleteAction, { backgroundColor: colors.danger }]}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.deleteText}>{t('common.delete')}</Text>
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
