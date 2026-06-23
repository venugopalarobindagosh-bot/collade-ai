import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchUserCredits,
  createUserCredits,
  updateUserCreditsByUserId,
  deductUserCredits,
  creditsStateFromRecord,
  shouldShowPayments,
} from "@/api/credits";
import { supabase } from "@/api/supabaseClient";

let sharedFetchPromise = null;
let cachedCredits = null;
let lastUserId = null;
const listeners = new Set();

function broadcast(state) {
  cachedCredits = state;
  listeners.forEach(fn => fn({ ...state }));
}

async function fetchCredits() {
  const me = await getCurrentUser();
  if (!me?.id) return null;

  if (lastUserId && lastUserId !== me.id) {
    cachedCredits = null;
    sharedFetchPromise = null;
  }
  lastUserId = me.id;

  console.log("[useCredits] Loading for", me.id);

  let record = await fetchUserCredits();

  if (!record) {
    console.warn("[useCredits] No DB row — NOT auto-creating. Add row in Supabase with user_id:", me.id);
    return {
      credits_remaining: 0,
      plan: "free",
      access_locked: true,
      welcome_shown: true,
      subscription_start: null,
      subscription_expiry: null,
      _id: null,
      _loaded: true,
    };
  }

  let plan = record.plan ?? "free";
  let credits = record.credits_remaining;
  if (credits < 0) credits = 0;

  if (plan === "premium" && record.subscription_expiry && new Date(record.subscription_expiry) < new Date()) {
    plan = "free";
    credits = 0;
    record = await updateUserCreditsByUserId(me.id, { plan: "free", balance: 0, credits_remaining: 0 });
  }

  const state = creditsStateFromRecord({ ...record, plan, credits_remaining: credits });

  // Auto-dismiss welcome for existing users with >5 credits
  if (!state.welcome_shown && state.credits_remaining > 5) {
    try {
      await updateUserCreditsByUserId(me.id, { welcome_shown: true });
      state.welcome_shown = true;
      localStorage.setItem(`collade_welcome_shown_${me.id}`, "true");
      console.log("[useCredits] Auto-marked welcome_shown (user has", state.credits_remaining, "credits)");
    } catch (e) {
      console.warn("[useCredits] Could not auto-set welcome_shown:", e.message);
    }
  }

  console.log("[useCredits] Loaded:", state.credits_remaining, "credits, welcome_shown:", state.welcome_shown);
  return state;
}

function loadOnce(force = false) {
  if (!force && sharedFetchPromise) return sharedFetchPromise;
  sharedFetchPromise = fetchCredits()
    .then(state => { if (state) broadcast(state); return state; })
    .catch(err => {
      console.error("[useCredits] load failed:", err?.message);
      sharedFetchPromise = null;
      throw err;
    });
  return sharedFetchPromise;
}

const DEFAULT_STATE = {
  credits_remaining: 0,
  plan: "free",
  access_locked: false,
  welcome_shown: true,
  subscription_start: null,
  subscription_expiry: null,
  _id: null,
  _loaded: false,
};

export function useCredits() {
  const [state, setState] = useState(() => cachedCredits || DEFAULT_STATE);
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState(null);

  useEffect(() => {
    listeners.add(setState);
    if (cachedCredits) setState({ ...cachedCredits });
    loadOnce().catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      if (event === "SIGNED_OUT") {
        sharedFetchPromise = null;
        cachedCredits = null;
        lastUserId = null;
        broadcast(DEFAULT_STATE);
      } else if (event === "SIGNED_IN") {
        sharedFetchPromise = null;
        cachedCredits = null;
        lastUserId = null;
        loadOnce(true).catch(() => {});
      }
    });

    return () => listeners.delete(setState);
  }, []);

  const deductCredit = useCallback(async () => {
    setDeductError(null);
    let waited = 0;
    while (!cachedCredits?._loaded && waited < 5000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }

    const previous = cachedCredits ? { ...cachedCredits } : null;
    setDeducting(true);

    try {
      const { deducted, premium } = await deductUserCredits(1);
      if (premium) return true;
      if (!deducted) { setDeductError("Out of credits"); return false; }

      sharedFetchPromise = null;
      const fresh = await fetchUserCredits();
      if (!fresh) throw new Error("Could not verify deduction");
      broadcast(creditsStateFromRecord(fresh));
      return true;
    } catch (err) {
      setDeductError(err?.message || "Deduction failed");
      if (previous) broadcast(previous);
      return false;
    } finally {
      setDeducting(false);
    }
  }, []);

  const markWelcomeShown = useCallback(async () => {
    const me = await getCurrentUser();
    if (!me?.id) return;
    broadcast({ ...(cachedCredits || DEFAULT_STATE), welcome_shown: true, _loaded: true });
    localStorage.setItem(`collade_welcome_shown_${me.id}`, "true");
    try {
      const updated = await updateUserCreditsByUserId(me.id, { welcome_shown: true });
      broadcast(creditsStateFromRecord(updated));
    } catch (e) {
      console.warn("[useCredits] markWelcomeShown:", e.message);
    }
  }, []);

  const refetch = useCallback(async () => {
    sharedFetchPromise = null;
    cachedCredits = null;
    await loadOnce(true);
  }, []);

  return {
    ...state,
    isPremium: state.plan === "premium",
    showPaymentOptions: shouldShowPayments(state.credits_remaining, state.plan),
    deducting,
    deductError,
    deductCredit,
    markWelcomeShown,
    refetch,
  };
}
