import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { generateInviteCode } from '@/lib/api/teams';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function InviteScreen() {
  const { isAdmin, currentTeam } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) return <Redirect href="/profilo" />;

  async function handleGenerate() {
    if (!currentTeam) return;
    setError(null);
    setLoading(true);
    try {
      const newCode = await generateInviteCode(currentTeam.id);
      setCode(newCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!code) return;
    await Share.share({
      message: `Entra in ${currentTeam?.name} su GK Coach! Usa il codice: ${code}`,
    });
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Genera un codice monouso valido 30 giorni. Condividilo con i portieri che vuoi aggiungere
          alla squadra <ThemedText type="smallBold">{currentTeam?.name}</ThemedText>.
        </ThemedText>

        {code ? (
          <ThemedView type="card" style={styles.codeCard}>
            <ThemedText type="title" style={styles.codeText}>
              {code}
            </ThemedText>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.8 }]}>
              <ThemedText type="smallBold" style={styles.copyBtnText}>
                Condividi codice
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        {error && (
          <ThemedText type="small" themeColor="accent">
            {error}
          </ThemedText>
        )}

        <Pressable
          onPress={handleGenerate}
          disabled={loading}
          style={({ pressed }) => [styles.generateBtn, loading && styles.disabled, pressed && { opacity: 0.8 }]}>
          {loading ? (
            <ActivityIndicator color={Colors.light.accentText} />
          ) : (
            <ThemedText type="smallBold" style={styles.generateBtnText}>
              {code ? 'Genera nuovo codice' : 'Genera codice invito'}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  description: {
    lineHeight: 22,
  },
  codeCard: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  codeText: {
    letterSpacing: 2,
    fontWeight: '800',
  },
  copyBtn: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  copyBtnText: {
    color: Colors.light.accent,
  },
  generateBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: Colors.light.accentText,
  },
});
