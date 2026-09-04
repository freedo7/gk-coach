import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/auth-context';
import { useThemePreference, type ThemePreference } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlan } from '@/hooks/use-plan';
import { haptic } from '@/hooks/use-haptic';
import { setLanguage } from '@/lib/i18n';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import type { Team } from '@/types/database';

const LANG_OPTIONS: { value: string; label: string; flag: string }[] = [
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'auto', label: 'Automatico', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Chiaro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Scuro', icon: 'moon-outline' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  preparatore: 'Preparatore',
  portiere: 'Portiere',
};

/* ── Row component (iOS-style) ── */
function SettingsRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  onPress,
  trailing,
  last,
}: {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  const colors = useTheme();
  const row = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg ?? colors.accent }]}>
        <Ionicons name={icon as any} size={18} color={iconColor ?? '#fff'} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText type="default">{label}</ThemedText>
        <View style={styles.rowRight}>
          {value !== undefined && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.rowValue}>
              {value}
            </ThemedText>
          )}
          {trailing}
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
        </View>
      </View>
    </View>
  );
  if (!onPress) return row;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {row}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.sectionHeader}>
      {title}
    </ThemedText>
  );
}

export default function ImpostazioniScreen() {
  const { t, i18n } = useTranslation();
  const { profile, isAdmin, signOut, teams, currentTeam, setCurrentTeam, createTeam } = useAuth();
  const colors = useTheme();
  const plan = usePlan();
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();

  const [query, setQuery] = useState('');
  const [notificheEnabled, setNotificheEnabled] = useState(true);

  // Team switcher modal
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!profile) return null;

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
    haptic('light');
    setCurrentTeam(team);
    setSwitcherVisible(false);
  }

  // Filter rows by search
  const trimmed = query.trim().toLowerCase();
  const match = (text: string) => !trimmed || text.toLowerCase().includes(trimmed);

  const planLabel = plan.tier === 'pro'
    ? '★ Pro'
    : plan.isTrialActive
    ? `Trial · ${plan.trialDaysLeft}gg`
    : 'Base';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Impostazioni</ThemedText>

          {/* Search */}
          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca nelle impostazioni..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </ThemedView>

          {/* ─── ACCOUNT ─── */}
          {(match('account') || match('nome') || match('email') || match('ruolo') || match('password')) && (
            <>
              <SectionHeader title="ACCOUNT" />
              <ThemedView type="card" style={styles.card}>
                {match('nome') && (
                  <SettingsRow
                    icon="person-outline"
                    iconBg="#5AC8FA"
                    label="Nome"
                    value={profile.full_name ?? '—'}
                    onPress={() => router.push('/profilo/edit-name')}
                  />
                )}
                {match('email') && (
                  <SettingsRow
                    icon="mail-outline"
                    iconBg="#FF9500"
                    label="Email"
                    value={profile.email}
                  />
                )}
                {match('ruolo') && (
                  <SettingsRow
                    icon="shield-outline"
                    iconBg="#AF52DE"
                    label="Ruolo"
                    value={ROLE_LABEL[profile.role]}
                  />
                )}
                {match('password') && (
                  <SettingsRow
                    icon="lock-closed-outline"
                    iconBg="#FF3B30"
                    label="Cambia password"
                    onPress={() => router.push('/profilo/edit-password')}
                    last
                  />
                )}
              </ThemedView>
            </>
          )}

          {/* ─── SQUADRA ─── */}
          {(match('squadra') || match('team') || match('membri') || match('invita') || match('portieri')) && (
            <>
              <SectionHeader title="SQUADRA" />
              <ThemedView type="card" style={styles.card}>
                {match('squadra') && (
                  <SettingsRow
                    icon="people-outline"
                    iconBg="#34C759"
                    label="Squadra attiva"
                    value={currentTeam?.name ?? '—'}
                    onPress={() => setSwitcherVisible(true)}
                  />
                )}
                {isAdmin && match('membri') && (
                  <SettingsRow
                    icon="person-add-outline"
                    iconBg="#007AFF"
                    label="Membri squadra"
                    onPress={() => router.push('/profilo/utenti')}
                  />
                )}
                {isAdmin && match('portieri') && (
                  <SettingsRow
                    icon="body-outline"
                    iconBg="#FF9500"
                    label="Portieri"
                    onPress={() => router.push('/profilo/portieri')}
                  />
                )}
                {isAdmin && match('invita') && (
                  <SettingsRow
                    icon="link-outline"
                    iconBg="#5856D6"
                    label="Invita portieri"
                    onPress={() => router.push('/profilo/invite')}
                    last
                  />
                )}
              </ThemedView>
            </>
          )}

          {/* ─── ABBONAMENTO ─── */}
          {(match('abbonamento') || match('pro') || match('piano') || match('upgrade')) && (
            <>
              <SectionHeader title="ABBONAMENTO" />
              <ThemedView type="card" style={styles.card}>
                <SettingsRow
                  icon="star-outline"
                  iconBg={plan.tier === 'pro' ? '#FFD60A' : '#FF9500'}
                  iconColor={plan.tier === 'pro' ? '#000' : '#fff'}
                  label="Piano attuale"
                  value={planLabel}
                  onPress={() => router.push('/profilo/paywall')}
                  last
                />
              </ThemedView>
            </>
          )}

          {/* ─── NOTIFICHE ─── */}
          {match('notifiche') && (
            <>
              <SectionHeader title="NOTIFICHE" />
              <ThemedView type="card" style={styles.card}>
                <SettingsRow
                  icon="notifications-outline"
                  iconBg="#FF3B30"
                  label="Notifiche push"
                  trailing={
                    <Switch
                      value={notificheEnabled}
                      onValueChange={(v) => { haptic('light'); setNotificheEnabled(v); }}
                      trackColor={{ false: colors.backgroundElement, true: colors.accent }}
                      thumbColor="#fff"
                    />
                  }
                  last
                />
              </ThemedView>
            </>
          )}

          {/* ─── ASPETTO ─── */}
          {(match('aspetto') || match('tema')) && (
            <>
              <SectionHeader title="ASPETTO" />
              <ThemedView type="card" style={styles.card}>
                {THEME_OPTIONS.map((opt, idx) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => { haptic('light'); setPreference(opt.value); }}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.row, idx < THEME_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
                      <View style={[styles.iconBox, { backgroundColor: '#5856D6' }]}>
                        <Ionicons name={opt.icon as any} size={18} color="#fff" />
                      </View>
                      <View style={styles.rowBody}>
                        <ThemedText type="default">{opt.label}</ThemedText>
                        {preference === opt.value && (
                          <Ionicons name="checkmark" size={20} color={colors.accent} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ThemedView>
            </>
          )}

          {/* ─── LINGUA ─── */}
          {(match('lingua') || match('language')) && (
            <>
              <SectionHeader title={t('settings.languageSection', 'LINGUA')} />
              <ThemedView type="card" style={styles.card}>
                {LANG_OPTIONS.map((opt, idx) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => { haptic('light'); setLanguage(opt.value); }}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.row, idx < LANG_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
                      <View style={[styles.iconBox, { backgroundColor: '#007AFF' }]}>
                        <ThemedText style={{ fontSize: 16 }}>{opt.flag}</ThemedText>
                      </View>
                      <View style={styles.rowBody}>
                        <ThemedText type="default">{opt.label}</ThemedText>
                        {i18n.language === opt.value && (
                          <Ionicons name="checkmark" size={20} color={colors.accent} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ThemedView>
            </>
          )}

          {/* ─── LOGOUT ─── */}
          <View style={{ marginTop: Spacing.three }}>
            <ThemedView type="card" style={styles.card}>
              <Pressable
                onPress={() => { haptic('warning'); signOut(); }}
                style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <ThemedText type="default" style={{ color: colors.danger }}>Esci</ThemedText>
              </Pressable>
            </ThemedView>
          </View>

          {/* Version */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
            GK Coach v1.0.0
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      {/* Modal squadre */}
      <Modal visible={switcherVisible} transparent animationType="slide" onRequestClose={() => setSwitcherVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSwitcherVisible(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.modalTitle}>Le tue squadre</ThemedText>

          {teams.map((team) => (
            <Pressable
              key={team.id}
              onPress={() => handleSwitchTeam(team)}
              style={({ pressed }) => [
                styles.teamItem,
                { backgroundColor: colors.backgroundElement },
                team.id === currentTeam?.id && { backgroundColor: colors.accentSoft },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{team.name}</ThemedText>
              {team.id === currentTeam?.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              )}
            </Pressable>
          ))}

          {isAdmin && !showCreateForm && (
            <Pressable
              onPress={() => setShowCreateForm(true)}
              style={({ pressed }) => [styles.newTeamBtn, { borderColor: colors.accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: colors.accent }}>+ Nuova squadra</ThemedText>
            </Pressable>
          )}

          {isAdmin && showCreateForm && (
            <View style={styles.createForm}>
              <TextInput
                placeholder="Nome squadra"
                placeholderTextColor={colors.textSecondary}
                value={newTeamName}
                onChangeText={setNewTeamName}
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
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
                  styles.createBtn,
                  { backgroundColor: colors.accent },
                  (creatingTeam || !newTeamName.trim()) && { opacity: 0.4 },
                  pressed && styles.pressed,
                ]}>
                {creatingTeam
                  ? <ActivityIndicator color={colors.accentText} />
                  : <ThemedText type="smallBold" style={{ color: colors.accentText }}>Crea</ThemedText>}
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
    gap: Spacing.one,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    marginLeft: Spacing.three,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionFooter: {
    marginTop: Spacing.one,
    marginLeft: Spacing.three,
  },
  card: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.three,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  rowValue: {
    maxWidth: 160,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  version: {
    textAlign: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  pressed: { opacity: 0.7 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
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
  },
  newTeamBtn: {
    marginTop: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  createForm: {
    marginTop: Spacing.one,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  createBtn: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
