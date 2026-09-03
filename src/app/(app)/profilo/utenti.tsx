import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { listTeamMembers, removeTeamMember, type TeamMemberWithProfile } from '@/lib/api/teams';
import { Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  preparatore: 'Preparatore',
  portiere: 'Portiere',
};

export default function UtentiScreen() {
  const { isAdmin, currentTeam, profile } = useAuth();
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
          <ActivityIndicator color={Colors.light.accent} style={styles.loader} />
        )}
        {members !== null && members.length === 0 && (
          <EmptyState icon="people-outline" title="Nessun membro" subtitle="Invita i portieri dalla sezione Invita portieri." />
        )}
        {members?.map((member) => (
          <ThemedView key={member.id} type="card" style={styles.userCard}>
            <View style={styles.userLeft}>
              <ThemedText type="smallBold">
                {member.profile.full_name || 'Senza nome'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {member.profile.email}
              </ThemedText>
            </View>
            <View style={styles.right}>
              <View
                style={[
                  styles.roleBadge,
                  (member.profile.role === 'admin' || member.profile.role === 'preparatore') && styles.roleBadgeAdmin,
                ]}>
                <ThemedText
                  type="small"
                  style={[
                    styles.roleText,
                    (member.profile.role === 'admin' || member.profile.role === 'preparatore') && styles.roleTextAdmin,
                  ]}>
                  {ROLE_LABEL[member.profile.role]}
                </ThemedText>
              </View>
              {member.profile.id !== profile?.id && (
                <Pressable
                  onPress={() => handleRemove(member.id, member.profile.id)}
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}>
                  <ThemedText type="small" style={styles.removeBtnText}>
                    Rimuovi
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
        ))}

        <Pressable
          onPress={() => router.push('/profilo/invite')}
          style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.8 }]}>
          <ThemedText type="smallBold" style={styles.inviteBtnText}>
            + Genera codice invito
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
    backgroundColor: Colors.light.backgroundElement,
  },
  roleBadgeAdmin: {
    backgroundColor: Colors.light.accent,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  roleTextAdmin: {
    color: Colors.light.accentText,
  },
  removeBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  removeBtnText: {
    color: Colors.light.danger ?? '#FF3B30',
    fontWeight: '600',
    fontSize: 11,
  },
  inviteBtn: {
    marginTop: Spacing.two,
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  inviteBtnText: {
    color: Colors.light.accentText,
  },
});
