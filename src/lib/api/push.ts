import { supabase } from '@/lib/supabase';

export async function sendPushToTeam(teamId: string, title: string, body: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.functions.invoke('send-push', {
      body: { teamId, title, body },
    });
  } catch {
    // Non bloccare il flusso se la notifica fallisce
  }
}

export async function sendPushToCoach(teamId: string, title: string, body: string) {
  try {
    // Trova il coach del team
    const { data: team } = await supabase
      .from('teams')
      .select('coach_id')
      .eq('id', teamId)
      .single();
    if (!team) return;

    // Prendi i token push del coach
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('profile_id', team.coach_id);
    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    // Non bloccare il flusso
  }
}
