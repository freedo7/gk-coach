import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (req) => {
  // Solo POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Autenticazione: accetta cron secret oppure JWT di un admin
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET) {
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Date di oggi e domani (UTC — gli allenamenti sono salvati come date ISO senza timezone)
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    // Allenamenti di oggi e domani
    const { data: trainings } = await supabase
      .from('trainings')
      .select('id, team_id, title, training_date, training_time')
      .in('training_date', [today, tomorrow]);

    // Partite di oggi e domani
    const { data: matches } = await supabase
      .from('matches')
      .select('id, team_id, opponent, match_date, match_time, is_home')
      .in('match_date', [today, tomorrow]);

    if ((!trainings || trainings.length === 0) && (!matches || matches.length === 0)) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no events' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Raggruppa eventi per team
    const teamEvents: Record<string, { trainings: typeof trainings; matches: typeof matches }> = {};

    for (const t of trainings ?? []) {
      if (!t.team_id) continue;
      if (!teamEvents[t.team_id]) teamEvents[t.team_id] = { trainings: [], matches: [] };
      teamEvents[t.team_id].trainings!.push(t);
    }
    for (const m of matches ?? []) {
      if (!m.team_id) continue;
      if (!teamEvents[m.team_id]) teamEvents[m.team_id] = { trainings: [], matches: [] };
      teamEvents[m.team_id].matches!.push(m);
    }

    const teamIds = Object.keys(teamEvents);
    if (teamIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prendi tutti i membri di questi team
    const { data: members } = await supabase
      .from('team_members')
      .select('team_id, profile_id')
      .in('team_id', teamIds);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prendi i token push di tutti i profili coinvolti
    const profileIds = [...new Set(members.map((m) => m.profile_id))];
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('profile_id, token')
      .in('profile_id', profileIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mappa profile_id → token(s)
    const tokenMap: Record<string, string[]> = {};
    for (const t of tokens) {
      if (!tokenMap[t.profile_id]) tokenMap[t.profile_id] = [];
      tokenMap[t.profile_id].push(t.token);
    }

    // Costruisci i messaggi push
    const messages: { to: string; sound: string; title: string; body: string }[] = [];

    for (const teamId of teamIds) {
      const events = teamEvents[teamId];
      // Trova i membri di questo team
      const teamMembers = members.filter((m) => m.team_id === teamId);

      for (const member of teamMembers) {
        const memberTokens = tokenMap[member.profile_id];
        if (!memberTokens) continue;

        // Reminder allenamenti
        for (const tr of events.trainings ?? []) {
          const isToday = tr.training_date === today;
          const when = isToday ? '📋 Oggi' : '📋 Domani';
          const time = tr.training_time ? ` alle ${tr.training_time.slice(0, 5)}` : '';
          for (const token of memberTokens) {
            messages.push({
              to: token,
              sound: 'default',
              title: `${when}: ${tr.title}`,
              body: `Allenamento in programma${time}`,
            });
          }
        }

        // Reminder partite
        for (const m of events.matches ?? []) {
          const isToday = m.match_date === today;
          const when = isToday ? '⚽ Oggi' : '⚽ Domani';
          const time = m.match_time ? ` alle ${m.match_time.slice(0, 5)}` : '';
          const venue = m.is_home ? '(casa)' : '(trasferta)';
          for (const token of memberTokens) {
            messages.push({
              to: token,
              sound: 'default',
              title: `${when}: ${m.opponent} ${venue}`,
              body: `Partita in programma${time}`,
            });
          }
        }
      }
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Invia tramite Expo Push API (batch da 100)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) {
        totalSent += chunk.length;
      } else {
        console.error('Expo push error:', await res.text());
      }
    }

    console.log(`Daily reminder: sent ${totalSent} notifications`);

    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('daily-reminder error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
