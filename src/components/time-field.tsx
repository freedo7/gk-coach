import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface Props {
  value: string | null;
  onChange: (time: string | null) => void;
  placeholder?: string;
}

function parseTime(value: string | null): Date {
  const now = new Date();
  if (!value) return now;
  const [h, m] = value.split(':').map(Number);
  now.setHours(h ?? 0, m ?? 0, 0, 0);
  return now;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ value, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseTime(value));

  function openPicker() {
    setTempDate(parseTime(value));
    setShow(true);
  }

  function confirm() {
    onChange(formatTime(tempDate));
    setShow(false);
  }

  return (
    <View>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.field}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <ThemedText
            type="default"
            themeColor={value ? 'text' : 'textSecondary'}
            style={styles.fieldText}>
            {value || placeholder || '-- : --'}
          </ThemedText>
          {value && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </ThemedView>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setShow(false)}>
            <Pressable style={[styles.modal, { backgroundColor: colors.backgroundElement }]}>
              <DateTimePicker
                mode="time"
                value={tempDate}
                is24Hour
                minuteInterval={5}
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
              />
              <Pressable
                onPress={confirm}
                style={[styles.confirmBtn, { backgroundColor: colors.accent }]}>
                <ThemedText type="smallBold" style={{ color: colors.accentText }}>
                  {t('common.confirm')}
                </ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            mode="time"
            value={tempDate}
            is24Hour
            minuteInterval={5}
            display="default"
            onChange={(_event, selectedDate) => {
              setShow(false);
              if (selectedDate) onChange(formatTime(selectedDate));
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  confirmBtn: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
