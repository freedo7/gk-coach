import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
import { sendPushToCoach } from '@/lib/api/push';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/toast-context';
import { useThemePreference, type ThemePreference } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlan } from '@/hooks/use-plan';
import { haptic } from '@/hooks/use-haptic';
import { setLanguage } from '@/lib/i18n';
import { useScreenTransition } from '@/components/theme-transition';
import { FadeIn } from '@/components/fade-in';
import { BottomTabInset, Fonts, Radius, Spacing } from '@/constants/theme';
import { LEGAL_URLS } from '@/constants/legal';
import type { Team } from '@/types/database';

const LANG_OPTIONS: { value: string; label: string; flag: string }[] = [
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

function useThemeOptions(): { value: ThemePreference; label: string; icon: string }[] {
  const { t } = useTranslation();
  return [
    { value: 'auto', label: t('settings.themeAuto'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('settings.themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon-outline' },
  ];
}

function useRoleLabel(): Record<string, string> {
  const { t } = useTranslation();
  return {
    admin: 'Admin',
    preparatore: t('settings.roleCoach'),
    portiere: t('settings.roleGoalkeeper'),
  };
}

/* ── Row component ── */
function SettingsRow({
  icon,
  label,
  value,
  onPress,
  trailing,
  last,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  const colors = useTheme();
  const row = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
      <Ionicons name={icon as any} size={20} color={colors.textSecondary} />
      <View style={styles.rowBody}>
        <ThemedText type="default">{label}</ThemedText>
        <View style={styles.rowRight}>
          {value !== undefined && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.rowValue}>
              {value}
            </ThemedText>
          )}
          {trailing}
          {onPress && !trailing && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
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
  const colors = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: colors.accent }]} />
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeaderText}>
        {title}
      </ThemedText>
    </View>
  );
}

export default function ImpostazioniScreen() {
  const { t, i18n } = useTranslation();
  const ROLE_LABEL = useRoleLabel();
  const THEME_OPTIONS = useThemeOptions();
  const { profile, isAdmin, signOut, deleteAccount, teams, currentTeam, setCurrentTeam, createTeam, leaveTeam } = useAuth();
  const colors = useTheme();
  const plan = usePlan();
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();
  const { show: showToast } = useToast();
  const { transitionTo } = useScreenTransition();

  const [query, setQuery] = useState('');
  const [notificheEnabled, setNotificheEnabled] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Team switcher modal
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  if (!profile) return null;

  function handleDeleteAccount() {
    haptic('warning');
    Alert.alert(
      t('settings.deleteAccountConfirm'),
      t('settings.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccountCta'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            const { error } = await deleteAccount();
            setDeletingAccount(false);
            if (error) showToast(t('settings.deleteAccountError'), 'error');
          },
        },
      ],
    );
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
    haptic('light');
    setCurrentTeam(team);
    setSwitcherVisible(false);
  }

  async function handleSendFeedback() {
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: profile.id,
      user_email: profile.email,
      message: feedbackText.trim(),
    });
    setSendingFeedback(false);
    if (!error) {
      setFeedbackText('');
      showToast(t('settings.feedbackSent'), 'success');
    }
  }

  // Filter rows by search
  const trimmed = query.trim().toLowerCase();
  const match = (text: string) => !trimmed || text.toLowerCase().includes(trimmed);

  const planLabel = plan.tier === 'pro'
    ? '★ Pro'
    : plan.isTrialActive
    ? `Trial · ${plan.trialDaysLeft}gg`
    : 'Base';

  const initials = (profile.full_name ?? profile.email)
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ── Hero profile card ── */}
          <FadeIn>
            <ThemedView type="card" style={styles.heroCard}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </View>
              <ThemedText style={styles.heroName}>
                {profile.full_name ?? profile.email}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {profile.email}
              </ThemedText>
              <View style={styles.heroBadges}>
                <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                  <ThemedText style={[styles.badgeText, { color: colors.accent }]}>
                    {ROLE_LABEL[profile.role]}
                  </ThemedText>
                </View>
                {currentTeam && (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundElement }]}>
                    <Ionicons name="people" size={12} color={colors.textSecondary} />
                    <ThemedText style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {currentTeam.name}
                    </ThemedText>
                  </View>
                )}
              </View>
            </ThemedView>
          </FadeIn>

          {/* Search */}
          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('settings.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </ThemedView>

          {/* ─── ACCOUNT ─── */}
          {(match('account') || match('nome') || match('email') || match('ruolo') || match('password')) && (
            <FadeIn delay={100}>
              <SectionHeader title={t('settings.accountSection')} />
              <ThemedView type="card" style={styles.card}>
                {match('nome') && (
                  <SettingsRow
                    icon="person-outline"
                    label={t('settings.name')}
                    value={profile.full_name ?? '—'}
                    onPress={() => router.push('/profilo/edit-name')}
                  />
                )}
                {match('telefono') && (
                  <SettingsRow
                    icon="call-outline"
                    label={t('settings.phone')}
                    value={profile.phone_verified ? (profile.phone ?? '') : t('settings.phoneNotVerified')}
                    onPress={() => router.push('/profilo/phone-verify')}
                  />
                )}
                {match('password') && (
                  <SettingsRow
                    icon="lock-closed-outline"
                    label={t('settings.changePassword')}
                    onPress={() => router.push('/profilo/edit-password')}
                    last
                  />
                )}
              </ThemedView>
            </FadeIn>
          )}

          {/* ─── SQUADRA ─── */}
          {(match('squadra') || match('team') || match('membri') || match('invita') || match('portieri')) && (
            <FadeIn delay={200}>
              <SectionHeader title={t('settings.teamSection')} />
              <ThemedView type="card" style={styles.card}>
                {match('squadra') && (
                  <SettingsRow
                    icon="people-outline"
                    label={t('settings.activeTeam')}
                    value={currentTeam?.name ?? '—'}
                    onPress={() => setSwitcherVisible(true)}
                  />
                )}
                {isAdmin && match('membri') && (
                  <SettingsRow
                    icon="person-add-outline"
                    label={t('settings.teamMembers')}
                    onPress={() => router.push('/profilo/utenti')}
                  />
                )}
                {isAdmin && match('portieri') && (
                  <SettingsRow
                    icon="body-outline"
                    label={t('settings.goalkeepers')}
                    onPress={() => router.push('/profilo/portieri')}
                  />
                )}
                {isAdmin && match('invita') && (
                  <SettingsRow
                    icon="link-outline"
                    label={t('settings.inviteGoalkeepers')}
                    onPress={() => router.push('/profilo/invite')}
                    last={isAdmin}
                  />
                )}
                {!isAdmin && match('abbandona') && (
                  <SettingsRow
                    icon="exit-outline"
                    label={t('settings.leaveTeam')}
                    onPress={() => {
                      haptic('warning');
                      Alert.alert(t('settings.leaveTeamConfirm'), t('settings.leaveTeamMessage'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('settings.leaveTeam'),
                          style: 'destructive',
                          onPress: () => {
                            if (currentTeam) {
                              const name = profile?.full_name ?? '';
                              sendPushToCoach(
                                currentTeam.id,
                                t('settings.leaveTeamPush'),
                                t('settings.leaveTeamPushBody', { name })
                              );
                            }
                            leaveTeam();
                          },
                        },
                      ]);
                    }}
                    last
                  />
                )}
              </ThemedView>
            </FadeIn>
          )}

          {/* ─── ABBONAMENTO ─── */}
          {(match('abbonamento') || match('pro') || match('piano') || match('upgrade') || match('feedback')) && (
            <FadeIn delay={300}>
              <SectionHeader title={t('settings.subscriptionSection')} />
              <ThemedView type="card" style={styles.card}>
                <SettingsRow
                  icon="star-outline"
                  label={t('settings.currentPlan')}
                  value={planLabel}
                  onPress={() => router.push('/profilo/paywall')}
                />
                <SettingsRow
                  icon="chatbubble-ellipses-outline"
                  label={t('settings.feedback')}
                  onPress={() => { haptic('light'); setFeedbackOpen(!feedbackOpen); }}
                  trailing={<Ionicons name={feedbackOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />}
                  last
                />
              </ThemedView>
              {feedbackOpen && (
                <View style={styles.feedbackBox}>
                  <TextInput
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    placeholder={t('settings.feedbackPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.feedbackInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.backgroundElement }]}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <Pressable
                    onPress={handleSendFeedback}
                    disabled={sendingFeedback || !feedbackText.trim()}
                    style={({ pressed }) => [
                      styles.feedbackBtn,
                      { backgroundColor: colors.accent },
                      (sendingFeedback || !feedbackText.trim()) && { opacity: 0.4 },
                      pressed && styles.pressed,
                    ]}>
                    {sendingFeedback
                      ? <ActivityIndicator color={colors.accentText} />
                      : <>
                          <Ionicons name="send-outline" size={16} color={colors.accentText} />
                          <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('settings.feedbackSend')}</ThemedText>
                        </>
                    }
                  </Pressable>
                </View>
              )}
            </FadeIn>
          )}

          {/* ─── NOTIFICHE ─── */}
          {match('notifiche') && (
            <FadeIn delay={350}>
              <SectionHeader title={t('settings.notificationsSection')} />
              <ThemedView type="card" style={styles.card}>
                <SettingsRow
                  icon="notifications-outline"
                  label={t('settings.pushNotifications')}
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
            </FadeIn>
          )}

          {/* ─── ASPETTO ─── */}
          {(match('aspetto') || match('tema')) && (
            <FadeIn delay={400}>
              <SectionHeader title={t('settings.appearanceSection')} />
              <ThemedView type="card" style={styles.card}>
                {THEME_OPTIONS.map((opt, idx) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => { haptic('light'); transitionTo(() => setPreference(opt.value)); }}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.row, idx < THEME_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
                      <Ionicons name={opt.icon as any} size={20} color={colors.textSecondary} />
                      <View style={styles.rowBody}>
                        <ThemedText type="default">{opt.label}</ThemedText>
                        {preference === opt.value && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ThemedView>
            </FadeIn>
          )}

          {/* ─── LINGUA ─── */}
          {(match('lingua') || match('language')) && (
            <FadeIn delay={450}>
              <SectionHeader title={t('settings.languageSection', 'LINGUA')} />
              <ThemedView type="card" style={styles.card}>
                {LANG_OPTIONS.map((opt, idx) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => { haptic('light'); transitionTo(() => setLanguage(opt.value)); }}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.row, idx < LANG_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundElement }]}>
                      <ThemedText style={{ fontSize: 18 }}>{opt.flag}</ThemedText>
                      <View style={styles.rowBody}>
                        <ThemedText type="default">{opt.label}</ThemedText>
                        {i18n.language === opt.value && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ThemedView>
            </FadeIn>
          )}

          {/* ─── INFO / LEGALE ─── */}
          {(match('info') || match('legale') || match('privacy') || match('termini') || match('cookie')) && (
            <FadeIn delay={475}>
              <SectionHeader title={t('settings.infoSection')} />
              <ThemedView type="card" style={styles.card}>
                <SettingsRow
                  icon="shield-checkmark-outline"
                  label={t('settings.privacyPolicy')}
                  onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
                />
                <SettingsRow
                  icon="document-text-outline"
                  label={t('settings.termsOfService')}
                  onPress={() => Linking.openURL(LEGAL_URLS.terms)}
                />
                <SettingsRow
                  icon="information-circle-outline"
                  label={t('settings.cookiePolicy')}
                  onPress={() => Linking.openURL(LEGAL_URLS.cookie)}
                  last
                />
              </ThemedView>
            </FadeIn>
          )}

          {/* ─── ADMIN ─── */}
          {isAdmin && (match('admin') || match('feedback') || match('utenti') || match('abbonamenti')) && (
            <FadeIn delay={500}>
              <SectionHeader title="ADMIN" />
              <ThemedView type="card" style={styles.card}>
                <SettingsRow
                  icon="mail-open-outline"
                  label={t('settings.feedbackList')}
                  onPress={() => router.push('/profilo/feedback' as any)}
                />
                <SettingsRow
                  icon="people-outline"
                  label={t('settings.adminUsers')}
                  onPress={() => router.push('/profilo/admin-users' as any)}
                />
                <SettingsRow
                  icon="card-outline"
                  label={t('settings.adminSubscriptions')}
                  onPress={() => router.push('/profilo/admin-subscriptions' as any)}
                  last
                />
              </ThemedView>
            </FadeIn>
          )}

          {/* ─── LOGOUT ─── */}
          <FadeIn delay={550}>
            <Pressable
              onPress={() => { haptic('warning'); signOut(); }}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <ThemedText type="small" style={{ color: colors.danger }}>{t('settings.logout')}</ThemedText>
            </Pressable>
          </FadeIn>

          {/* ─── ELIMINA ACCOUNT ─── */}
          <FadeIn delay={575}>
            <Pressable
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
              style={({ pressed }) => [styles.deleteAccountBtn, pressed && styles.pressed]}>
              {deletingAccount ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color={colors.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">{t('settings.deleteAccount')}</ThemedText>
                </>
              )}
            </Pressable>
          </FadeIn>

          {/* Version */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
            GK Coach v1.0.0
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      {/* Modal squadre */}
      <Modal visible={switcherVisible} transparent animationType="slide" onRequestClose={() => setSwitcherVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalOverlay} onPress={() => setSwitcherVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>{t('settings.yourTeams')}</ThemedText>

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
                <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('settings.newTeam')}</ThemedText>
              </Pressable>
            )}

            {isAdmin && showCreateForm && (
              <View style={styles.createForm}>
                <TextInput
                  placeholder={t('settings.teamNamePlaceholder')}
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
                    : <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('common.create')}</ThemedText>}
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.one,
  },
  /* ── Hero card ── */
  heroCard: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: Fonts.sansBold,
    color: '#fff',
  },
  heroName: {
    fontSize: 22,
    fontFamily: Fonts.sansBold,
    lineHeight: 26,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.half + 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
  },
  /* ── Search ── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  /* ── Section header ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  sectionHeaderText: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  /* ── Card & rows ── */
  card: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
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
  /* ── Logout ── */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
    paddingVertical: Spacing.two,
  },
  version: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  /* ── Feedback ── */
  feedbackBox: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  feedbackInput: {
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
    minHeight: 80,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  /* ── Modal ── */
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
