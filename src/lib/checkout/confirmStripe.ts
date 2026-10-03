import { supabase } from "@/integrations/supabase/client";

/**
 * After Stripe redirects back, ask the server to verify the session with
 * Stripe and fulfill the order right away (doesn't wait for the webhook).
 * Returns true when Stripe reports the payment as paid.
 */
export async function confirmStripePayment(
  searchParams: URLSearchParams,
  kind: "order" | "lc" | "dp" | "sub",
  id: string | null | undefined,
): Promise<boolean> {
  if (searchParams.get("gateway") !== "stripe" || searchParams.get("cancelled") || !id) return false;
  try {
    const { data } = await supabase.functions.invoke("stripe-confirm", { body: { kind, id } });
    return !!data?.paid;
  } catch {
    return false;
  }
}
