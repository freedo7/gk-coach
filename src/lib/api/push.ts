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
