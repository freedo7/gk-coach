import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PushRequest {
  teamId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verifica che chi chiama sia autenticato
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verifica il JWT del chiamante
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { teamId, title, body, data }: PushRequest = await req.json();

    if (!teamId || !title || !body) {
      return new Response('Missing teamId, title, or body', { status: 400 });
    }

    // Verifica che il chiamante sia il coach della squadra
    const { data: team } = await supabase
      .from('teams')
      .select('coach_id')
      .eq('id', teamId)
      .single();

    if (!team || team.coach_id !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Prendi i token push dei membri della squadra (escluso il coach)
    const { data: members } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', teamId)
      .neq('profile_id', user.id);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const memberIds = members.map((m) => m.profile_id);

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('profile_id', memberIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Invia le notifiche tramite Expo Push API
    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));

    // Expo accetta batch fino a 100 messaggi
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (res.ok) {
        totalSent += chunk.length;
      } else {
        console.error('Expo push error:', await res.text());
      }
    }

    console.log(`Sent ${totalSent} push notifications for team ${teamId}`);

    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-push error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
