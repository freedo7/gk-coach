import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/context/toast-context';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/hooks/use-haptic';
import { Radius, Spacing } from '@/constants/theme';

export default function EditPasswordScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = newPassword.length >= 6 && newPassword === confirmPassword;

  async function handleSave() {
    setError(null);
    if (newPassword.length < 6) { setError(t('editPassword.tooShort')); return; }
    if (newPassword !== confirmPassword) { setError(t('editPassword.mismatch')); return; }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (err) { haptic('error'); setError(err.message); return; }
    haptic('success');
    showToast(t('editPassword.updated'));
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary">{t('editPassword.newPasswordLabel')}</ThemedText>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder={t('editPassword.newPasswordPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoFocus
          style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
        />

        <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginTop: Spacing.three }}>
          {t('editPassword.confirmLabel')}
        </ThemedText>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder={t('editPassword.confirmPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
        />

        {error && (
          <ThemedText type="small" themeColor="accent" style={{ marginTop: Spacing.two }}>{error}</ThemedText>
        )}

        <Pressable
          onPress={handleSave}
          disabled={!valid || saving}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            (!valid || saving) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          {saving
            ? <ActivityIndicator color={colors.accentText} />
            : <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('editPassword.updateButton')}</ThemedText>}
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
    marginTop: Spacing.three,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
