import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { listTeamMembers, removeTeamMember, type TeamMemberWithProfile } from '@/lib/api/teams';
import { Radius, Spacing } from '@/constants/theme';

export default function UtentiScreen() {
  const { t } = useTranslation();

  const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin',
    preparatore: t('settings.roleCoach'),
    portiere: t('settings.roleGoalkeeper'),
  };
  const { isAdmin, currentTeam, profile } = useAuth();
  const colors = useTheme();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMemberWithProfile[] | null>(null);

  useEffect(() => {
    if (!currentTeam) return;
    listTeamMembers(currentTeam.id).then(setMembers);
  }, [currentTeam]);

  if (!isAdmin) return <Redirect href="/profilo" />;

  async function handleRemove(memberId: string, profileId: string) {
    if (!currentTeam) return;
    await removeTeamMember(currentTeam.id, profileId);
    setMembers((prev) => prev?.filter((m) => m.id !== memberId) ?? null);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {members === null && (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        )}
        {members !== null && members.length === 0 && (
          <EmptyState icon="people-outline" title={t('teamMembers.noMembers')} subtitle={t('teamMembers.inviteSubtitle')} />
        )}
        {members?.map((member) => (
          <ThemedView key={member.id} type="card" style={styles.userCard}>
            <View style={styles.userLeft}>
              <ThemedText type="smallBold">
                {member.profile.full_name || t('teamMembers.noName')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {member.profile.email}
              </ThemedText>
            </View>
            <View style={styles.right}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.backgroundElement },
                  (member.profile.role === 'admin' || member.profile.role === 'preparatore') && { backgroundColor: colors.accent },
                ]}>
                <ThemedText
                  type="small"
                  style={[
                    styles.roleText,
                    { color: colors.textSecondary },
                    (member.profile.role === 'admin' || member.profile.role === 'preparatore') && { color: colors.accentText },
                  ]}>
                  {ROLE_LABEL[member.profile.role]}
                </ThemedText>
              </View>
              {member.profile.id !== profile?.id && (
                <Pressable
                  onPress={() => handleRemove(member.id, member.profile.id)}
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}>
                  <ThemedText type="small" style={[styles.removeBtnText, { color: colors.danger }]}>
                    {t('teamMembers.remove')}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
        ))}

        <Pressable
          onPress={() => router.push('/profilo/invite')}
          style={({ pressed }) => [styles.inviteBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}>
          <ThemedText type="smallBold" style={{ color: colors.accentText }}>
            {t('teamMembers.generateInvite')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  loader: { marginTop: Spacing.five },
  userCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLeft: {
    gap: Spacing.half,
    flexShrink: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  roleBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  removeBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  removeBtnText: {
    fontWeight: '600',
    fontSize: 11,
  },
  inviteBtn: {
    marginTop: Spacing.two,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
