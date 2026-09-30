import { supabase } from './supabaseClient';
import { getCurrentUser } from '@/lib/auth';

const CREDITS_TABLE = 'user_credits';

export function normalizeCreditsRow(row) {
  if (!row) return null;
  const credits = Number(row.balance ?? row.credits_remaining ?? 0) || 0;
  return {
    ...row,
    credits_remaining: credits,
    balance: credits,
    plan: row.plan ?? 'free',
    welcome_shown: Boolean(row.welcome_shown),
    access_locked: row.access_locked ?? false,
  };
}

async function selectAllForUser(me) {
  const { data: byUserId, error: e1 } = await supabase
    .from(CREDITS_TABLE)
    .select('*')
    .eq('user_id', me.id);

  if (e1) throw e1;
  let rows = byUserId || [];

  if (rows.length === 0 && me.email) {
    const { data: byEmail, error: e2 } = await supabase
      .from(CREDITS_TABLE)
      .select('*')
      .eq('created_by', me.email);
    if (e2) throw e2;
    rows = byEmail || [];
  }

  return rows.map(normalizeCreditsRow);
}

function pickCanonicalRow(rows, userId) {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => {
    if (a.user_id === userId && b.user_id !== userId) return -1;
    if (b.user_id === userId && a.user_id !== userId) return 1;
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
  return normalizeCreditsRow(sorted[0]);
}

/**
 * Reads the user's credit row.
 * NOTE: This is a READ-ONLY function. All writes happen server-side
 * in the `career-search`, `verify-payment-tier`, and `razorpay-webhook`
 * edge functions using the service_role key.
 */
export async function fetchUserCredits() {
  const me = await getCurrentUser();
  if (!me?.id) return null;

  const rows = await selectAllForUser(me);
  if (rows.length === 0) return null;

  return pickCanonicalRow(rows, me.id);
}

/**
 * Converts a DB row to a UI-friendly state object.
 * NOTE: No more "premium = infinite" override — all tiers are credit packs.
 */
export function creditsStateFromRecord(record) {
  let credits = record.credits_remaining ?? 0;
  if (credits < 0) credits = 0;

  return {
    credits_remaining: credits,
    plan: record.plan ?? 'free',
    access_locked: credits <= 0,
    welcome_shown: Boolean(record.welcome_shown),
    _id: record.id,
    _loaded: true,
  };
}

export function shouldShowPayments(credits, plan) {
  return credits <= 100;
}