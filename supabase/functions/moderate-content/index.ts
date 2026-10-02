import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { postId, table, text } = await req.json();

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const airouterKey = Deno.env.get('AIROUTER_API_KEY');

    // AI classifier prompt
    const prompt = `You are a content moderation classifier for a student career app.

Classify this content as one of: OK, SPAM, ILLEGAL, HARASSMENT.

Content: "${text}"

Rules:
- SPAM: advertising, repetitive nonsense, links to unrelated sites, fake promotions
- ILLEGAL: drugs, weapons, illegal activities, child safety issues
- HARASSMENT: bullying, hate speech, threats, personal attacks
- OK: normal questions, career discussions, student sharing

Return JSON: {"category": "OK|SPAM|ILLEGAL|HARASSMENT", "confidence": 0.0-1.0, "reason": "short explanation"}`;

    const aiRes = await fetch('https://api.airouter.in/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3.2',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });

    const aiData = await aiRes.json();
    const result = JSON.parse(aiData.choices?.[0]?.message?.content || '{}');

    // Auto-hide if flagged
    if (result.category !== 'OK' && result.confidence > 0.7) {
      await serviceClient
        .from(table)
        .update({
          is_hidden: true,
          auto_flagged: true,
          flag_reason: `${result.category}: ${result.reason}`,
        })
        .eq('id', postId);
    }

    return new Response(JSON.stringify({ classified: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Moderate error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});