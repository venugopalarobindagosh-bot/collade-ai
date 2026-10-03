// Supabase Edge Function: career-search (STREAMING)
// Deploy: supabase functions deploy career-search --project-ref xdmofpfxykrxneybdeal
// Provider: Airouter.in → DeepSeek V3.2 with real-time streaming

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

  let creditRow = null;
  let currentBalance = 0;
  let serviceClient = null;
  let creditsDeducted = false;

  try {
    // ── 1. Verify auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Rate limit ──
    if (isRateLimited(user.id)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Parse request body ──
    const { prompt, query } = await req.json();
    const userQuery = prompt || query;

    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'Missing prompt or query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Fetch and deduct credits ──
    serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: fetchedCredit, error: creditError } = await serviceClient
      .from('user_credits')
      .select('id, balance, credits_remaining, plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creditError || !fetchedCredit) {
      return new Response(JSON.stringify({ error: 'Failed to verify credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    creditRow = fetchedCredit;
    currentBalance = Number(creditRow.balance ?? creditRow.credits_remaining ?? 0);

    if (currentBalance < 1) {
      return new Response(JSON.stringify({
        error: 'out_of_credits',
        message: 'You have run out of credits. Please upgrade to continue.',
        credits_remaining: 0,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Failed to deduct credit' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    creditsDeducted = true;

    // ── 5. Get AI key ──
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
      return new Response(JSON.stringify({ error: 'AI key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[career-search] Starting streaming call to Airouter...');

    // ── 6. Stream from Airouter ──
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 85000);

    let aiRes;
    try {
      aiRes = await fetch('https://api.airouter.in/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airouterKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
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
          stream: true,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiRes.ok || !aiRes.body) {
      console.error('[career-search] Airouter error:', aiRes.status);

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

      return new Response(JSON.stringify({
        error: 'AI provider error',
        message: 'The AI service is temporarily unavailable. Your credit was refunded.',
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 7. Transform and stream the response ──
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Send credit info as the first SSE event
    const creditEvent = `event: credits\ndata: ${JSON.stringify({ credits_remaining: newBalance, plan: creditRow.plan })}\n\n`;
    writer.write(encoder.encode(creditEvent));

    // Pipe Airouter's SSE chunks directly to the client
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();

    (async () => {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                writer.write(encoder.encode('event: done\ndata: {}\n\n'));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  writer.write(encoder.encode(`event: token\ndata: ${JSON.stringify({ text: content })}\n\n`));
                }
              } catch (e) {
                // Ignore malformed chunks
              }
            }
          }
        }
        await writer.close();
      } catch (err) {
        console.error('[career-search] Stream error:', err);
        try {
          writer.write(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`));
        } catch (e) {}
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err) {
    console.error('[career-search] Error:', err);

    // Refund if credits were deducted
    if (creditsDeducted && serviceClient && creditRow) {
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

    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: 'timeout',
        message: 'AI is taking too long. Your credit was refunded.',
      }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: err.message || 'Something went wrong' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});