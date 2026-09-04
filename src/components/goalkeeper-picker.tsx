import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { listGoalkeepers, createGoalkeeper } from '@/lib/api/goalkeepers';
import type { Goalkeeper } from '@/types/database';
import { Radius, Spacing } from '@/constants/theme';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function GoalkeeperPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { currentTeam, profile } = useAuth();
  const [goalkeepers, setGoalkeepers] = useState<Goalkeeper[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (currentTeam) {
      listGoalkeepers(currentTeam.id).then(setGoalkeepers).catch(() => {});
    }
  }, [currentTeam]);

  async function handleAdd() {
    if (!newName.trim() || !currentTeam || !profile) return;
    const gk = await createGoalkeeper(newName.trim(), currentTeam.id, profile.id);
    setGoalkeepers((prev) => [...prev, gk].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(gk.id);
    setNewName('');
    setShowAdd(false);
    haptic('success');
  }

  if (goalkeepers.length === 0 && !showAdd) {
    return (
      <Pressable
        onPress={() => setShowAdd(true)}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.addBtn}>
          <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
          <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('components.addGoalkeeper')}</ThemedText>
        </ThemedView>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        <Pressable
          onPress={() => { haptic('light'); onChange(null); }}
          style={styles.chipWrapper}>
          <ThemedView
            type={value === null ? undefined : 'backgroundElement'}
            style={[styles.chip, value === null && { backgroundColor: colors.accent }]}>
            <ThemedText
              type="small"
              style={{ color: value === null ? colors.accentText : colors.textSecondary, fontWeight: '600' }}>
              {t('components.allGoalkeepers')}
            </ThemedText>
          </ThemedView>
        </Pressable>
        {goalkeepers.map((gk) => {
          const selected = value === gk.id;
          return (
            <Pressable
              key={gk.id}
              onPress={() => { haptic('light'); onChange(selected ? null : gk.id); }}
              style={styles.chipWrapper}>
              <ThemedView
                type={selected ? undefined : 'backgroundElement'}
                style={[styles.chip, selected && { backgroundColor: colors.accent }]}>
                <ThemedText
                  type="small"
                  style={{ color: selected ? colors.accentText : colors.text, fontWeight: '600' }}>
                  {gk.name}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => { setShowAdd(true); haptic('light'); }}
          style={styles.chipWrapper}>
          <ThemedView type="backgroundElement" style={styles.chip}>
            <Ionicons name="add" size={16} color={colors.accent} />
          </ThemedView>
        </Pressable>
      </View>

      {showAdd && (
        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t('components.goalkeeperNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoFocus
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, flex: 1 }]}
            onSubmitEditing={handleAdd}
          />
          <Pressable
            onPress={handleAdd}
            disabled={!newName.trim()}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: colors.accent },
              !newName.trim() && { opacity: 0.4 },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('components.addButton')}</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  chipWrapper: {},
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  addBtn: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  confirmBtn: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
