import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RC_WEBHOOK_SECRET = Deno.env.get('RC_WEBHOOK_SECRET');

// Eventi RevenueCat che attivano/disattivano Pro
const PRO_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
]);

const BASE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
]);

Deno.serve(async (req) => {
  // Solo POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verifica authorization header (secret condiviso con RevenueCat)
  if (RC_WEBHOOK_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${RC_WEBHOOK_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response('No event', { status: 400 });
    }

    const eventType: string = event.type;
    const appUserId: string = event.app_user_id;

    if (!appUserId) {
      return new Response('No app_user_id', { status: 400 });
    }

    // Determina il nuovo tier
    let newTier: string | null = null;

    if (PRO_EVENTS.has(eventType)) {
      newTier = 'pro';
    } else if (BASE_EVENTS.has(eventType)) {
      newTier = 'base';
    }

    // Evento non rilevante (es. TRANSFER, TEST) — ignora
    if (!newTier) {
      return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiorna il profilo con service_role (bypassa RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from('profiles')
      .update({ subscription_tier: newTier })
      .eq('id', appUserId);

    if (error) {
      console.error('Supabase update error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Updated ${appUserId} → ${newTier} (event: ${eventType})`);

    return new Response(JSON.stringify({ ok: true, tier: newTier }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
