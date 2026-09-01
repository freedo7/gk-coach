import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  if (!profile) return null;

  const dirty = fullName.trim() !== (profile.full_name ?? '');

  async function handleSave() {
    setProfileError(null);
    setProfileNotice(null);
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { setProfileError(error.message); return; }
    await refreshProfile();
    setProfileNotice('Salvato.');
  }

  async function handleChangePassword() {
    setPwError(null);
    setPwNotice(null);
    if (newPassword.length < 6) { setPwError('Minimo 6 caratteri.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Le password non coincidono.'); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { setPwError(error.message); return; }
    setPwNotice('Password aggiornata!');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Profilo</ThemedText>

          {/* Info profilo */}
          <ThemedView type="card" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">Nome</ThemedText>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nome e cognome"
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.input}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>Email</ThemedText>
            <ThemedText type="default" style={styles.displayValue}>{profile.email}</ThemedText>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>Ruolo</ThemedText>
            <ThemedView type="backgroundElement" style={styles.roleBadge}>
              <ThemedText type="smallBold">{ROLE_LABEL[profile.role]}</ThemedText>
            </ThemedView>
            {!isAdmin && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.roleHint}>
                Il ruolo viene assegnato dal preparatore.
              </ThemedText>
            )}

            {profileError && (
              <ThemedText type="small" themeColor="accent" style={styles.fieldSpacing}>{profileError}</ThemedText>
            )}
            {profileNotice && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldSpacing}>{profileNotice}</ThemedText>
            )}

            <Pressable
              onPress={handleSave}
              disabled={!dirty || saving}
              style={({ pressed }) => [styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled, pressed && styles.pressed]}>
              {saving
                ? <ActivityIndicator color={Colors.light.accentText} />
                : <ThemedText type="smallBold" style={styles.saveButtonText}>Salva modifiche</ThemedText>}
            </Pressable>
          </ThemedView>

          {/* Cambia password */}
          <ThemedView type="card" style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Cambia password</ThemedText>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>Nuova password</ThemedText>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Minimo 6 caratteri"
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.input}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldSpacing}>Conferma password</ThemedText>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />

            {pwError && (
              <ThemedText type="small" themeColor="accent" style={styles.fieldSpacing}>{pwError}</ThemedText>
            )}
            {pwNotice && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldSpacing}>{pwNotice}</ThemedText>
            )}

            <Pressable
              onPress={handleChangePassword}
              disabled={changingPw}
              style={({ pressed }) => [styles.saveButton, changingPw && styles.saveButtonDisabled, pressed && styles.pressed]}>
              {changingPw
                ? <ActivityIndicator color={Colors.light.accentText} />
                : <ThemedText type="smallBold" style={styles.saveButtonText}>Aggiorna password</ThemedText>}
            </Pressable>
          </ThemedView>

          {/* Admin: squadra */}
          {isAdmin && (
            <>
              <Pressable
                onPress={() => router.push('/profilo/utenti')}
                style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Membri squadra</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push('/profilo/invite')}
                style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Invita portieri</ThemedText>
              </Pressable>
            </>
          )}

          {/* Logout */}
          <Pressable
            onPress={signOut}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.logoutButtonText}>Esci</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 16,
  },
  displayValue: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  fieldSpacing: { marginTop: Spacing.three },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  roleHint: { marginTop: Spacing.one },
  saveButton: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: Colors.light.accentText },
  adminButton: {
    backgroundColor: Colors.light.card,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.light.danger,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  logoutButtonText: { color: '#ffffff' },
  pressed: { opacity: 0.7 },
});
