import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_LABEL = {
  admin: 'Preparatore portieri',
  portiere: 'Portiere',
} as const;

export default function ProfiloScreen() {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;
  const currentProfile = profile;

  const dirty =
    fullName.trim() !== (currentProfile.full_name ?? '') || email.trim() !== currentProfile.email;

  async function handleSave() {
    setError(null);
    setNotice(null);
    setSaving(true);

    if (email.trim() !== currentProfile.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        setSaving(false);
        setError(emailError.message);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), email: email.trim() })
      .eq('id', currentProfile.id);

    setSaving(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }

    await refreshProfile();
    setNotice(
      email.trim() !== currentProfile.email
        ? 'Salvato. Se richiesto, controlla la tua nuova email per confermare il cambio.'
        : 'Salvato.'
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Profilo</ThemedText>

        <ThemedView type="card" style={styles.card}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Nome
          </ThemedText>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nome e cognome"
            placeholderTextColor={Colors.light.textSecondary}
            style={styles.input}
          />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>
            Email
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>
            Ruolo
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.roleBadge}>
            <ThemedText type="smallBold">{ROLE_LABEL[profile.role]}</ThemedText>
          </ThemedView>
          {!isAdmin && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.roleHint}>
              Il ruolo viene assegnato dal preparatore.
            </ThemedText>
          )}

          {error && (
            <ThemedText type="small" themeColor="accent" style={styles.fieldSpacing}>
              {error}
            </ThemedText>
          )}
          {notice && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.fieldSpacing}>
              {notice}
            </ThemedText>
          )}

          <Pressable
            onPress={handleSave}
            disabled={!dirty || saving}
            style={({ pressed }) => [
              styles.saveButton,
              (!dirty || saving) && styles.saveButtonDisabled,
              pressed && styles.pressed,
            ]}>
            {saving ? (
              <ActivityIndicator color={Colors.light.accentText} />
            ) : (
              <ThemedText type="smallBold" style={styles.saveButtonText}>
                Salva modifiche
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.logoutButtonText}>
            Esci
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 16,
  },
  fieldSpacing: {
    marginTop: Spacing.three,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  roleHint: {
    marginTop: Spacing.one,
  },
  saveButton: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: Colors.light.accentText,
  },
  logoutButton: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.light.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
