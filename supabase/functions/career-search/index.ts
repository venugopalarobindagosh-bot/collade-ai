// Supabase Edge Function: career-search
// Deploy: supabase functions deploy career-search --project-ref xdmofpfxykrxneybdeal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate limit: max 10 requests per user per minute ──
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return false;
}

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

    // ── 2. Rate limit ──
    if (isRateLimited(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Parse request body ──
    const { prompt, query } = await req.json();
    const userQuery = prompt || query;

    if (!userQuery) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Fetch credit row (service_role) ──
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: creditRow, error: creditError } = await serviceClient
      .from('user_credits')
      .select('id, balance, credits_remaining, plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creditError) {
      console.error('Credit fetch error:', creditError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creditRow) {
      return new Response(
        JSON.stringify({ error: 'No credit record found. Please contact support.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Check balance ──
    const currentBalance = Number(creditRow.balance ?? creditRow.credits_remaining ?? 0);

    if (currentBalance < 1) {
      return new Response(
        JSON.stringify({
          error: 'out_of_credits',
          message: 'You have run out of credits. Please upgrade to continue.',
          credits_remaining: 0,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 6. Deduct 1 credit (always, everyone) ──
    const newBalance = currentBalance - 1;
    const { error: updateError } = await serviceClient
      .from('user_credits')
      .update({
        balance: newBalance,
        credits_remaining: newBalance,
        access_locked: newBalance <= 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditRow.id);

    if (updateError) {
      console.error('Credit deduction error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 7. Call Groq ──
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      // Refund
      await serviceClient
        .from('user_credits')
        .update({
          balance: currentBalance,
          credits_remaining: currentBalance,
          access_locked: currentBalance <= 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditRow.id);
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: `You are Collade AI, an expert career intelligence assistant. You help students choose future-proof careers.

For ANY career the user asks about, you MUST return a structured response with:

1. Career Overview: What this career actually involves (2-3 sentences)
2. AI Disruption Risk: A percentage (0-100%) and a clear explanation of which tasks in this role AI can/cannot replace
3. Salary Range in India: Actual numbers (e.g., ₹5-12 LPA for entry level)
4. Salary Range Globally: Actual numbers (e.g., $60,000-$90,000 USD)
5. Education Required: Specific degrees or certifications needed
6. Entry Level Job Titles: 2-3 specific job titles someone can search for
7. Future Outlook: Will demand increase or decrease in the next 5-10 years?
8. Country Demand: Which countries are hiring for this role right now (India, USA, UK, Singapore, UAE)

Be specific. Use real numbers. Do NOT say "varies" without giving context. Do NOT show any code, JSON, or raw data. Always write in clear, readable paragraphs.

If you don't know a specific number, say "The data is uncertain, but typically ranges from X to Y" — never just say "varies."`,
          },
          { role: 'user', content: userQuery },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq error:', groqData);

      // Refund
      await serviceClient
        .from('user_credits')
        .update({
          balance: currentBalance,
          credits_remaining: currentBalance,
          access_locked: currentBalance <= 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditRow.id);

      return new Response(
        JSON.stringify({ error: groqData?.error?.message || 'Groq API error' }),
        { status: groqRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const answer = groqData.choices?.[0]?.message?.content || '';

    // ── 8. Return answer + updated credit balance ──
    return new Response(
      JSON.stringify({
        answer,
        result: answer,
        response: answer,
        credits_remaining: newBalance,
        plan: creditRow.plan,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('career-search error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});