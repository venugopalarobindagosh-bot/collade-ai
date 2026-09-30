import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchUserCredits,
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
    console.warn("[useCredits] No DB row — showing empty state");
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

  // Check expiry locally — no DB write needed
  const isPremiumExpired =
    plan === "premium" &&
    record.subscription_expiry &&
    new Date(record.subscription_expiry) < new Date();

  if (isPremiumExpired) {
    console.log("[useCredits] Premium expired — showing as free");
    plan = "free";
    credits = 0;
  }

  const state = creditsStateFromRecord({ ...record, plan, credits_remaining: credits });

  // Local welcome flag — no DB write
  if (!state.welcome_shown && state.credits_remaining > 5) {
    state.welcome_shown = true;
    try {
      localStorage.setItem(`collade_welcome_shown_${me.id}`, "true");
    } catch (e) {}
  }

  console.log("[useCredits] Loaded:", state.credits_remaining, "credits");
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

    // ── Listen for credit updates from the edge function (via llm.js) ──
    const onCreditsUpdated = (e) => {
      const { credits_remaining, premium } = e.detail || {};
      if (credits_remaining === undefined || credits_remaining === null) return;

      const next = {
        ...(cachedCredits || DEFAULT_STATE),
        credits_remaining: premium ? 9999 : credits_remaining,
        plan: premium ? "premium" : (cachedCredits?.plan || "free"),
        access_locked: !premium && credits_remaining <= 0,
        _loaded: true,
      };
      broadcast(next);
      console.log("[useCredits] Credits updated from server:", credits_remaining, "premium:", premium);
    };
    window.addEventListener("collade:credits-updated", onCreditsUpdated);

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

    return () => {
      listeners.delete(setState);
      window.removeEventListener("collade:credits-updated", onCreditsUpdated);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * ⚠️ NO-OP: Credit deduction happens server-side inside the
   * `career-search` edge function. This function is kept for API
   * compatibility with existing pages that call `deductCredit()`.
   */
  const deductCredit = useCallback(async () => {
    setDeductError(null);
    let waited = 0;
    while (!cachedCredits?._loaded && waited < 5000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }

    const cached = cachedCredits;
    if (cached && cached.plan !== "premium" && (cached.credits_remaining ?? 0) <= 0) {
      setDeductError("Out of credits");
      return false;
    }

    return true;
  }, []);

  const markWelcomeShown = useCallback(async () => {
    const me = await getCurrentUser();
    if (!me?.id) return;
    // Local-only — no DB write
    broadcast({ ...(cachedCredits || DEFAULT_STATE), welcome_shown: true, _loaded: true });
    try {
      localStorage.setItem(`collade_welcome_shown_${me.id}`, "true");
    } catch (e) {}
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