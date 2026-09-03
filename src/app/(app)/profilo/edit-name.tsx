import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/context/toast-context';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/hooks/use-haptic';
import { Radius, Spacing } from '@/constants/theme';

export default function EditNameScreen() {
  const { profile, refreshProfile } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const dirty = fullName.trim() !== (profile.full_name ?? '');

  async function handleSave() {
    haptic('medium');
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile!.id);
    setSaving(false);
    if (error) { haptic('error'); showToast(error.message, 'error'); return; }
    haptic('success');
    showToast('Nome aggiornato');
    refreshProfile();
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary">NOME</ThemedText>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nome e cognome"
          placeholderTextColor={colors.textSecondary}
          autoFocus
          style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
        />
        <Pressable
          onPress={handleSave}
          disabled={!dirty || saving}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            (!dirty || saving) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          {saving
            ? <ActivityIndicator color={colors.accentText} />
            : <ThemedText type="smallBold" style={{ color: colors.accentText }}>Salva</ThemedText>}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    marginTop: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
