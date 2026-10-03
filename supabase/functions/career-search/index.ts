// Supabase Edge Function: career-search
// Deploy: supabase functions deploy career-search --project-ref xdmofpfxykrxneybdeal
// Provider: Airouter.in → routes to DeepSeek V3.2 with JSON mode
// Timeout: 85s (before Supabase's 120s hard limit)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map();

const AI_TIMEOUT_MS = 85000;

function isRateLimited(userId) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return false;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let creditRow = null;
  let currentBalance = 0;
  let serviceClient = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (isRateLimited(user.id)) {
      return jsonResponse({ error: 'Too many requests. Please wait a moment.' }, 429);
    }

    const { prompt, query } = await req.json();
    const userQuery = prompt || query;

    if (!userQuery) {
      return jsonResponse({ error: 'Missing prompt or query' }, 400);
    }

    serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: fetchedCredit, error: creditError } = await serviceClient
      .from('user_credits')
      .select('id, balance, credits_remaining, plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creditError) {
      console.error('Credit fetch error:', creditError);
      return jsonResponse({ error: 'Failed to verify credits' }, 500);
    }

    if (!fetchedCredit) {
      return jsonResponse({ error: 'No credit record found. Please contact support.' }, 403);
    }

    creditRow = fetchedCredit;
    currentBalance = Number(creditRow.balance ?? creditRow.credits_remaining ?? 0);

    if (currentBalance < 1) {
      return jsonResponse({
        error: 'out_of_credits',
        message: 'You have run out of credits. Please upgrade to continue.',
        credits_remaining: 0,
      }, 402);
    }

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
      return jsonResponse({ error: 'Failed to deduct credit' }, 500);
    }

    const airouterKey = Deno.env.get('AIROUTER_API_KEY');
    if (!airouterKey) {
      await serviceClient
        .from('user_credits')
        .update({
          balance: currentBalance,
          credits_remaining: currentBalance,
          access_locked: currentBalance <= 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditRow.id);
      return jsonResponse({ error: 'AI key not configured' }, 500);
    }

    console.log('[career-search] Calling Airouter (85s timeout)...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiRes;
    try {
      aiRes = await fetch('https://api.airouter.in/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airouterKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-v3.2',
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

Keep your responses focused and reasonably concise — aim for 400-600 words maximum.

If you don't know a specific number, say "The data is uncertain, but typically ranges from X to Y" — never just say "varies."`,
            },
            { role: 'user', content: userQuery },
          ],
          temperature: 0.7,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[career-search] Airouter status:', aiRes.status);
    const rawText = await aiRes.text();

    let aiData;
    try {
      aiData = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[career-search] Non-JSON response. Raw:', rawText.slice(0, 300));

      await serviceClient
        .from('user_credits')
        .update({
          balance: currentBalance,
          credits_remaining: currentBalance,
          access_locked: currentBalance <= 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditRow.id);

      return jsonResponse({ error: 'AI returned an invalid response. Please try again.' }, 502);
    }

    if (!aiRes.ok) {
      console.error('[career-search] Airouter error:', aiData);

      await serviceClient
        .from('user_credits')
        .update({
          balance: currentBalance,
          credits_remaining: currentBalance,
          access_locked: currentBalance <= 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditRow.id);

      return jsonResponse({ error: aiData?.error?.message || 'AI provider error' }, aiRes.status);
    }

    const answer = aiData.choices?.[0]?.message?.content || '';

    return jsonResponse({
      answer,
      result: answer,
      response: answer,
      credits_remaining: newBalance,
      plan: creditRow.plan,
    });

  } catch (err) {
    console.error('[career-search] Error:', err);

    if (err.name === 'AbortError') {
      if (serviceClient && creditRow) {
        try {
          await serviceClient
            .from('user_credits')
            .update({
              balance: currentBalance,
              credits_remaining: currentBalance,
              access_locked: currentBalance <= 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', creditRow.id);
        } catch (refundErr) {
          console.error('[career-search] Refund failed:', refundErr);
        }
      }

      return jsonResponse({
        error: 'timeout',
        message: 'AI is taking too long. Your credit was refunded. Please try again with a shorter question.',
      }, 504);
    }

    return jsonResponse({ error: err.message || 'Something went wrong' }, 500);
  }
});