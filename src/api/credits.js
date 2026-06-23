import { supabase } from './supabaseClient';
import { getCurrentUser } from '@/lib/auth';

const CREDITS_TABLE = 'user_credits';
const log = (...args) => console.log('[Credits]', ...args);

const ALLOWED_COLUMNS = new Set([
  'balance', 'credits_remaining', 'plan', 'access_locked', 'welcome_shown',
  'subscription_start', 'subscription_expiry', 'razorpay_payment_id', 'user_id', 'created_by',
]);

export function normalizeCreditsRow(row) {
  if (!row) return null;
  const credits = Number(row.balance ?? row.credits_remaining ?? 0) || 0;
  return {
    ...row,
    credits_remaining: credits,
    balance: credits,
    plan: row.plan ?? 'free',
    welcome_shown: Boolean(row.welcome_shown),
    subscription_start: row.subscription_start ?? null,
    subscription_expiry: row.subscription_expiry ?? null,
    access_locked: row.access_locked ?? false,
    created_date: row.created_at,
  };
}

function toDbPayload(updates) {
  const payload = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'credits_remaining' || key === 'balance') {
      payload.balance = value;
      payload.credits_remaining = value;
    } else if (ALLOWED_COLUMNS.has(key)) {
      payload[key] = value;
    }
  }
  return payload;
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

async function linkRecordToUser(record, me) {
  if (!record?.id || record.user_id === me.id) return record;

  log('Linking row', record.id, 'to user_id', me.id);
  const { data, error } = await supabase
    .from(CREDITS_TABLE)
    .update({ user_id: me.id, created_by: me.email || record.created_by, updated_at: new Date().toISOString() })
    .eq('id', record.id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Link failed: ${error.message}`);
  if (!data) throw new Error('Link failed: RLS blocked update. Set user_id in Supabase Table Editor.');
  return normalizeCreditsRow(data);
}

export async function fetchUserCredits() {
  const me = await getCurrentUser();
  if (!me?.id) {
    log('Not authenticated');
    return null;
  }

  log('Fetching for user_id:', me.id);
  const rows = await selectAllForUser(me);
  log('Found', rows.length, 'row(s)');

  if (rows.length === 0) return null;

  let canonical = pickCanonicalRow(rows, me.id);
  canonical = await linkRecordToUser(canonical, me);

  log('Result:', { id: canonical.id, user_id: canonical.user_id, balance: canonical.balance, welcome_shown: canonical.welcome_shown });
  return canonical;
}

export async function createUserCredits(record) {
  const existing = await fetchUserCredits();
  if (existing) return existing;

  const me = await getCurrentUser();
  if (!me?.id) throw new Error('Must be logged in to create credits');

  const row = toDbPayload({ ...record, user_id: me.id, created_by: me.email });
  log('Creating new row:', row);

  const { data, error } = await supabase.from(CREDITS_TABLE).insert(row).select().single();
  if (error) throw new Error(`Create failed: ${error.message}`);
  return normalizeCreditsRow(data);
}

/** ✅ FIXED: Update by user_id with separate fetch */
export async function updateCreditsRecord(recordId, userId, updates) {
  const me = await getCurrentUser();
  if (!me?.id) throw new Error('Not authenticated');

  const payload = toDbPayload(updates);
  payload.user_id = userId || me.id;
  if (me.email) payload.created_by = me.email;

  log('UPDATE user_id=', me.id, payload);

  // ✅ FIX: Update without .select() to avoid 400 error
  const { error } = await supabase
    .from(CREDITS_TABLE)
    .update(payload)
    .eq('user_id', me.id);

  if (error) {
    console.error('[Credits] Update error:', error);
    throw new Error(`Update failed: ${error.message}`);
  }

  // Fetch the updated record separately
  const { data: updatedData, error: fetchError } = await supabase
    .from(CREDITS_TABLE)
    .select('*')
    .eq('user_id', me.id)
    .maybeSingle();

  if (fetchError) {
    console.error('[Credits] Fetch after update error:', fetchError);
    throw new Error(`Fetch after update failed: ${fetchError.message}`);
  }

  if (!updatedData) {
    throw new Error(`No row found for user_id=${me.id}`);
  }

  log('UPDATE success:', updatedData.balance);
  return normalizeCreditsRow(updatedData);
}

export async function updateUserCreditsByUserId(userId, updates) {
  const record = await fetchUserCredits();
  if (!record?.id) throw new Error('No credit record to update');
  return updateCreditsRecord(record.id, userId, updates);
}

export async function deductUserCredits(amount = 1) {
  const me = await getCurrentUser();
  if (!me?.id) throw new Error('Not authenticated');

  const record = await fetchUserCredits();
  if (!record) throw new Error('No credit record. Add a row in Supabase user_credits with your user_id.');

  log('DEDUCT start:', { id: record.id, user_id: record.user_id, balance: record.balance, plan: record.plan });

  if (record.plan === 'premium') {
    return { record, deducted: true, premium: true };
  }

  if (record.credits_remaining <= 0) {
    return { record, deducted: false, premium: false };
  }

  const newBalance = record.credits_remaining - amount;
  log('DEDUCT', record.credits_remaining, '->', newBalance);

  const updated = await updateCreditsRecord(record.id, me.id, {
    balance: newBalance,
    credits_remaining: newBalance,
    access_locked: newBalance <= 0,
  });

  const verified = await fetchUserCredits();
  if (!verified || verified.credits_remaining !== newBalance) {
    throw new Error(`Deduction not saved (expected ${newBalance}, got ${verified?.credits_remaining ?? 'none'})`);
  }

  log('DEDUCT verified:', verified.balance);
  return { record: verified, deducted: true, premium: false };
}

export function creditsStateFromRecord(record) {
  let plan = record.plan ?? 'free';
  let credits = record.credits_remaining;
  if (credits < 0) credits = 0;
  if (plan === 'premium') credits = 9999;

  return {
    credits_remaining: credits,
    plan,
    access_locked: plan !== 'premium' && credits <= 0,
    welcome_shown: Boolean(record.welcome_shown),
    subscription_start: record.subscription_start ?? null,
    subscription_expiry: record.subscription_expiry ?? null,
    _id: record.id,
    _loaded: true,
  };
}

export function shouldShowPayments(credits, plan) {
  return plan !== 'premium' && credits <= 100;
}

export async function updateUserCredits(id, updates) {
  const me = await getCurrentUser();
  return updateCreditsRecord(id, me?.id, updates);
}