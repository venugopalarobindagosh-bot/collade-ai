// Supabase Edge Function: razorpay-webhook
// Handles Razorpay payment.captured events for Collade AI
// Deploy: supabase functions deploy razorpay-webhook --project-ref xdmofpfxykrxneybdeal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

// ── Tier config: what each amount grants ──
// Matches the same tiers as verify-payment-tier
const TIERS_BY_AMOUNT = {
  50000:  { credits: 50,   plan: 'basic',   subscriptionMonths: 0 },  // ₹500
  100000: { credits: 500,  plan: 'pro',     subscriptionMonths: 0 },  // ₹1,000
  500000: { credits: 9999, plan: 'premium', subscriptionMonths: 6 },  // ₹5,000
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('[Webhook] No signature');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[Webhook] Webhook secret not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Verify signature ──
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== signature) {
      console.error('[Webhook] Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(body);

    if (payload.event !== 'payment.captured') {
      console.log('[Webhook] Ignoring event:', payload.event);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = payload.payload.payment.entity;
    const userEmail = payment.email || payment.notes?.email;
    const paymentId = payment.id;
    const amount = Number(payment.amount);

    if (!userEmail) {
      console.error('[Webhook] No email in payment');
      return new Response(JSON.stringify({ error: 'No email in payment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Match amount to a tier ──
    const tier = TIERS_BY_AMOUNT[amount];
    if (!tier) {
      console.warn('[Webhook] Unknown amount:', amount);
      return new Response(JSON.stringify({ error: 'Unknown amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Webhook] Processing:', { userEmail, paymentId, amount, tier });

    // ── Service role client (bypasses RLS) ──
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Check if this payment was already applied (dedup) ──
    const { data: existing } = await serviceClient
      .from('user_credits')
      .select('id, balance, credits_remaining, plan, razorpay_payment_id, subscription_expiry, subscription_start')
      .eq('created_by', userEmail)
      .maybeSingle();

    if (existing?.razorpay_payment_id === paymentId) {
      console.log('[Webhook] Already applied, skipping');
      return new Response(JSON.stringify({ status: 'already_applied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Calculate new state ──
    const currentCredits = Number(existing?.balance ?? existing?.credits_remaining ?? 0);
    const newBalance = currentCredits + tier.credits;

    const expires =
      tier.subscriptionMonths > 0
        ? new Date(Date.now() + tier.subscriptionMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : existing?.subscription_expiry || null;

    if (existing) {
      // Update existing row
      const { error: updateError } = await serviceClient
        .from('user_credits')
        .update({
          balance: newBalance,
          credits_remaining: newBalance,
          plan: tier.plan,
          access_locked: false,
          subscription_start: tier.subscriptionMonths > 0 ? new Date().toISOString() : existing.subscription_start,
          subscription_expiry: expires,
          razorpay_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[Webhook] Update error:', updateError);
        return new Response(JSON.stringify({ error: 'DB update failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // No existing row for this email — create one
      // Note: user_id will be null until user signs up. When they do, we'll link.
      const { error: insertError } = await serviceClient
        .from('user_credits')
        .insert({
          created_by: userEmail,
          balance: newBalance,
          credits_remaining: newBalance,
          plan: tier.plan,
          access_locked: false,
          welcome_shown: true,
          subscription_start: tier.subscriptionMonths > 0 ? new Date().toISOString() : null,
          subscription_expiry: expires,
          razorpay_payment_id: paymentId,
        });

      if (insertError) {
        console.error('[Webhook] Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'DB insert failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[Webhook] ✅ Credits granted:', { userEmail, credits: tier.credits, plan: tier.plan });

    return new Response(JSON.stringify({ status: 'ok', credits_added: tier.credits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[Webhook] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});