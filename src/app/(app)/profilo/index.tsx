import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { usePlan } from '@/hooks/use-plan';
import { supabase } from '@/lib/supabase';
import { BottomTabInset, Colors, Radius, Spacing } from '@/constants/theme';
import type { Team } from '@/types/database';

const ROLE_LABEL = {
  admin: 'Preparatore portieri',
  portiere: 'Portiere',
} as const;

export default function ProfiloScreen() {
  const { profile, isAdmin, signOut, refreshProfile, teams, currentTeam, setCurrentTeam, createTeam } = useAuth();
  const plan = usePlan();
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

  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setCreateTeamError(null);
    setCreatingTeam(true);
    const { error } = await createTeam(newTeamName.trim());
    setCreatingTeam(false);
    if (error) { setCreateTeamError(error); return; }
    setNewTeamName('');
    setShowCreateForm(false);
    setSwitcherVisible(false);
  }

  function handleSwitchTeam(team: Team) {
    setCurrentTeam(team);
    setSwitcherVisible(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Profilo</ThemedText>

          {/* Squadra attiva */}
          <ThemedView type="card" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">SQUADRA ATTIVA</ThemedText>
            <View style={styles.teamRow}>
              <ThemedText type="subtitle" style={styles.teamName}>
                {currentTeam?.name ?? '—'}
              </ThemedText>
              {teams.length > 0 && (
                <Pressable
                  onPress={() => setSwitcherVisible(true)}
                  style={({ pressed }) => [styles.switchBtn, pressed && styles.pressed]}>
                  <ThemedText type="small" style={styles.switchBtnText}>
                    {teams.length > 1 ? 'Cambia' : 'Gestisci'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => router.push('/profilo/paywall')}
              style={({ pressed }) => [styles.planBadge, pressed && styles.pressed,
                plan.tier === 'pro' && styles.planBadgePro,
                plan.isTrialActive && styles.planBadgeTrial,
                !plan.isTrialActive && plan.tier !== 'pro' && styles.planBadgeBase,
              ]}>
              <ThemedText type="small" style={styles.planBadgeText}>
                {plan.tier === 'pro'
                  ? '★ Pro'
                  : plan.isTrialActive
                  ? `Trial — ${plan.trialDaysLeft}gg rimanenti`
                  : 'Base — Passa a Pro'}
              </ThemedText>
            </Pressable>
          </ThemedView>

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

      {/* Modal squadre */}
      <Modal visible={switcherVisible} transparent animationType="slide" onRequestClose={() => setSwitcherVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSwitcherVisible(false)} />
        <View style={styles.modalSheet}>
          <ThemedText type="subtitle" style={styles.modalTitle}>Le tue squadre</ThemedText>

          {teams.map((team) => (
            <Pressable
              key={team.id}
              onPress={() => handleSwitchTeam(team)}
              style={({ pressed }) => [
                styles.teamItem,
                team.id === currentTeam?.id && styles.teamItemActive,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{team.name}</ThemedText>
              {team.id === currentTeam?.id && (
                <ThemedText type="small" style={styles.activeLabel}>Attiva</ThemedText>
              )}
            </Pressable>
          ))}

          {isAdmin && !showCreateForm && (
            <Pressable
              onPress={() => setShowCreateForm(true)}
              style={({ pressed }) => [styles.newTeamBtn, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.newTeamBtnText}>+ Nuova squadra</ThemedText>
            </Pressable>
          )}

          {isAdmin && showCreateForm && (
            <View style={styles.createForm}>
              <TextInput
                placeholder="Nome squadra"
                placeholderTextColor={Colors.light.textSecondary}
                value={newTeamName}
                onChangeText={setNewTeamName}
                style={styles.input}
                autoFocus
              />
              {createTeamError && (
                <ThemedText type="small" themeColor="accent" style={{ marginTop: Spacing.one }}>
                  {createTeamError}
                </ThemedText>
              )}
              <Pressable
                onPress={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                style={({ pressed }) => [
                  styles.saveButton,
                  (creatingTeam || !newTeamName.trim()) && styles.saveButtonDisabled,
                  pressed && styles.pressed,
                  { marginTop: Spacing.two },
                ]}>
                {creatingTeam
                  ? <ActivityIndicator color={Colors.light.accentText} />
                  : <ThemedText type="smallBold" style={styles.saveButtonText}>Crea</ThemedText>}
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
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
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  teamName: {
    flex: 1,
    fontWeight: '700',
  },
  switchBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  switchBtnText: {
    color: Colors.light.accentText,
    fontWeight: '600',
  },
  planBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
  },
  planBadgePro: {
    backgroundColor: Colors.light.accent,
  },
  planBadgeTrial: {
    backgroundColor: Colors.light.accentSoft,
  },
  planBadgeBase: {
    backgroundColor: Colors.light.dangerSoft,
  },
  planBadgeText: {
    fontWeight: '600',
    color: Colors.light.text,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
  },
  teamItemActive: {
    backgroundColor: Colors.light.accentSoft,
  },
  activeLabel: {
    color: Colors.light.accent,
    fontWeight: '600',
  },
  newTeamBtn: {
    marginTop: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  newTeamBtnText: {
    color: Colors.light.accent,
  },
  createForm: {
    marginTop: Spacing.one,
  },
});
