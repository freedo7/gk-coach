import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

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
  const colors = useTheme();
  const [show, setShow] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setShow(true)}
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

      {show && (
        <DateTimePicker
          mode="time"
          value={parseTime(value)}
          is24Hour
          minuteInterval={5}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selectedDate) => {
            setShow(Platform.OS === 'ios');
            if (selectedDate) {
              onChange(formatTime(selectedDate));
            }
          }}
        />
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
});
