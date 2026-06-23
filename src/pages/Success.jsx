import { useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";

/**
 * Razorpay redirect landing page.
 * Set Razorpay Payment Link redirect URL to: http://localhost:5173/success?plan=basic
 * Plans: basic → success-starter, pro → success-pro, premium → success-unlimited
 */
export default function Success() {
  const [params] = useSearchParams();
  const plan = (params.get("plan") || params.get("plan_id") || "basic").toLowerCase();

  useEffect(() => {
    console.log("[Payment] Success redirect received, plan:", plan);
  }, [plan]);

  if (plan.includes("premium") || plan.includes("unlimited")) {
    return <Navigate to="/success-unlimited" replace />;
  }
  if (plan.includes("pro")) {
    return <Navigate to="/success-pro" replace />;
  }
  return <Navigate to="/success-starter" replace />;
}
