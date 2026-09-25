// Supabase Edge Function: career-search
// Deploy: supabase functions deploy career-search --project-ref xdmofpfxykrxneybdeal
// Secret:  supabase secrets set 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 --project-ref xdmofpfxykrxneybdeal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, query } = await req.json();
    const userQuery = prompt || query;

    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'Missing prompt or query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
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
      return new Response(JSON.stringify({ error: groqData?.error?.message || 'Groq API error' }), {
        status: groqRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const answer = groqData.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ answer, result: answer, response: answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('career-search error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});