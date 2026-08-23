import { Calendar } from 'react-native-calendars';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Colors, Radius } from '@/constants/theme';

interface Props {
  value: string | null;
  onChange: (date: string) => void;
}

export function DateField({ value, onChange }: Props) {
  return (
    <ThemedView type="backgroundElement" style={styles.wrapper}>
      <Calendar
        current={value ?? undefined}
        firstDay={1}
        onDayPress={(day) => onChange(day.dateString)}
        markedDates={value ? { [value]: { selected: true } } : {}}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          textSectionTitleColor: Colors.light.textSecondary,
          dayTextColor: Colors.light.text,
          todayTextColor: Colors.light.accent,
          monthTextColor: Colors.light.text,
          arrowColor: Colors.light.accent,
          selectedDayBackgroundColor: Colors.light.accent,
          selectedDayTextColor: Colors.light.accentText,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
        }}
        style={styles.calendar}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: Radius.card,
  },
});
