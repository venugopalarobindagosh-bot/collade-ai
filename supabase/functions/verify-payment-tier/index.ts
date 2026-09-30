// Supabase Edge Function: verify-payment-tier
// Deploy: supabase functions deploy verify-payment-tier --project-ref xdmofpfxykrxneybdeal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Tier config: what each tier costs and grants ──
const TIERS = {
  starter: {
    amount: 50000,        // ₹500 in paise
    credits: 50,
    plan: 'basic',
    subscriptionMonths: 0, // No subscription
  },
  pro: {
    amount: 100000,       // ₹1,000 in paise
    credits: 500,
    plan: 'pro',
    subscriptionMonths: 0,
  },
  premium: {
    amount: 500000,       // ₹5,000 in paise
    credits: 9999,
    plan: 'premium',
    subscriptionMonths: 6,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Parse request body ──
    const { tier } = await req.json();
    if (!tier || !TIERS[tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be starter, pro, or premium.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tierConfig = TIERS[tier];

    // ── 3. Get Razorpay credentials ──
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(
        JSON.stringify({ error: 'Server config error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Fetch recent payments from Razorpay ──
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const fromTimestamp = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const paymentsUrl = `https://api.razorpay.com/v1/payments?from=${fromTimestamp}&count=100`;

    const paymentsRes = await fetch(paymentsUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!paymentsRes.ok) {
      console.error('Razorpay API error:', await paymentsRes.text());
      return new Response(
        JSON.stringify({ error: 'Failed to verify with Razorpay' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentsData = await paymentsRes.json();
    const payments = paymentsData.items || [];

    // ── 5. Find a matching payment ──
    const matchingPayment = payments.find((p: any) => {
      const amountOk = p.amount === tierConfig.amount;
      const statusOk = p.status === 'captured';
      const emailOk =
        p.email?.toLowerCase() === user.email?.toLowerCase() ||
        p.notes?.user_email?.toLowerCase() === user.email?.toLowerCase();
      return amountOk && statusOk && emailOk;
    });

    if (!matchingPayment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid payment found. Please complete payment on colladeai.com first.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 6. Write to user_credits (service_role) ──
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Check if this payment has already been used ──
    const { data: existing } = await serviceClient
      .from('user_credits')
      .select('id, balance, credits_remaining, plan, razorpay_payment_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.razorpay_payment_id === matchingPayment.id) {
      // Already applied — return current state
      return new Response(
        JSON.stringify({
          success: true,
          already_applied: true,
          credits_remaining: existing.credits_remaining,
          plan: existing.plan,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new state
    const currentCredits = Number(existing?.balance ?? existing?.credits_remaining ?? 0);
    const newBalance = currentCredits + tierConfig.credits;

    const expires =
      tierConfig.subscriptionMonths > 0
        ? new Date(Date.now() + tierConfig.subscriptionMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : existing?.subscription_expiry || null;

    if (existing) {
      // Update existing row
      const { error: updateError } = await serviceClient
        .from('user_credits')
        .update({
          balance: newBalance,
          credits_remaining: newBalance,
          plan: tierConfig.plan,
          access_locked: false,
          subscription_start: tierConfig.subscriptionMonths > 0 ? new Date().toISOString() : existing.subscription_start,
          subscription_expiry: expires,
          razorpay_payment_id: matchingPayment.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('DB update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to save credits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Insert new row
      const { error: insertError } = await serviceClient.from('user_credits').insert({
        user_id: user.id,
        created_by: user.email,
        balance: newBalance,
        credits_remaining: newBalance,
        plan: tierConfig.plan,
        access_locked: false,
        welcome_shown: true,
        subscription_start: tierConfig.subscriptionMonths > 0 ? new Date().toISOString() : null,
        subscription_expiry: expires,
        razorpay_payment_id: matchingPayment.id,
      });

      if (insertError) {
        console.error('DB insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save credits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tier: tier,
        credits_added: tierConfig.credits,
        credits_remaining: newBalance,
        plan: tierConfig.plan,
        expiry: expires,
        payment_id: matchingPayment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('verify-payment-tier error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});