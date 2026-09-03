import { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/context/toast-context';
import { haptic } from '@/hooks/use-haptic';
import { listGoalkeepers, createGoalkeeper, deleteGoalkeeper } from '@/lib/api/goalkeepers';
import type { Goalkeeper } from '@/types/database';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

export default function PortieriScreen() {
  const { profile, currentTeam } = useAuth();
  const colors = useTheme();
  const { show: showToast } = useToast();
  const [goalkeepers, setGoalkeepers] = useState<Goalkeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!currentTeam) return;
    setLoading(true);
    listGoalkeepers(currentTeam.id)
      .then(setGoalkeepers)
      .finally(() => setLoading(false));
  }, [currentTeam]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAdd() {
    if (!newName.trim() || !currentTeam || !profile) return;
    setAdding(true);
    try {
      const gk = await createGoalkeeper(newName.trim(), currentTeam.id, profile.id);
      setGoalkeepers((prev) => [...prev, gk].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      haptic('success');
      showToast(`${gk.name} aggiunto`);
    } catch (err) {
      showToast(`Errore: ${(err as any)?.message ?? JSON.stringify(err)}`, 'error');
    } finally {
      setAdding(false);
    }
  }

  function handleDelete(gk: Goalkeeper) {
    haptic('warning');
    Alert.alert('Rimuovere il portiere?', gk.name, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: async () => {
          setGoalkeepers((prev) => prev.filter((g) => g.id !== gk.id));
          showToast(`${gk.name} rimosso`);
          try {
            await deleteGoalkeeper(gk.id);
          } catch {
            showToast('Errore durante la rimozione', 'error');
            load();
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Add form */}
        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome portiere"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, flex: 1 }]}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <Pressable
            onPress={handleAdd}
            disabled={adding || !newName.trim()}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.accent },
              (adding || !newName.trim()) && { opacity: 0.4 },
              pressed && styles.pressed,
            ]}>
            {adding
              ? <ActivityIndicator color={colors.accentText} size="small" />
              : <Ionicons name="add" size={22} color={colors.accentText} />}
          </Pressable>
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.five }} />
        ) : goalkeepers.length === 0 ? (
          <ThemedView type="card" style={styles.emptyCard}>
            <Ionicons name="person-outline" size={36} color={colors.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Aggiungi i portieri della tua squadra per tracciare le loro statistiche.
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.list}>
            {goalkeepers.map((gk) => (
              <ThemedView type="card" key={gk.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
                    <ThemedText type="smallBold" style={{ color: colors.accent }}>
                      {gk.name.split(' ').map((w) => w.charAt(0).toUpperCase()).join('')}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={{ fontWeight: '600' }}>{gk.name}</ThemedText>
                </View>
                <Pressable
                  onPress={() => handleDelete(gk)}
                  hitSlop={12}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </ThemedView>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  addBtn: {
    borderRadius: Radius.control,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: Spacing.one,
  },
  row: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: Radius.card,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: { opacity: 0.7 },
});
