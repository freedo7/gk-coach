import { Calendar } from 'react-native-calendars';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';

interface Props {
  value: string | null;
  onChange: (date: string) => void;
}

export function DateField({ value, onChange }: Props) {
  const colors = useTheme();
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
          textSectionTitleColor: colors.textSecondary,
          dayTextColor: colors.text,
          todayTextColor: colors.accent,
          monthTextColor: colors.text,
          arrowColor: colors.accent,
          selectedDayBackgroundColor: colors.accent,
          selectedDayTextColor: colors.accentText,
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
