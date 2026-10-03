import { createClient } from "npm:@supabase/supabase-js@2";

export interface AuthResult {
  ok: boolean;
  status: number;
  error?: string;
  user?: { id: string; email?: string };
}

/**
 * Verifies the request is made by an authenticated user whose role is one of
 * the allowed roles ("mentor" | "admin" by default).
 *
 * Uses the caller's JWT (Authorization header) and a service-role client to
 * check the `user_roles` table.
 */
export async function requireRole(
  req: Request,
  allowed: string[] = ["mentor", "admin"],
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Allow direct service-role invocations (e.g. internal function-to-function calls).
  const token = authHeader.slice(7);
  if (token === SERVICE) {
    return { ok: true, status: 200, user: { id: "service_role" } };
  }

  const anonClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await anonClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const roleNames = (roles || []).map((r: { role: string }) => r.role);
  const permitted = roleNames.some((r) => allowed.includes(r));
  if (!permitted) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return {
    ok: true,
    status: 200,
    user: { id: userData.user.id, email: userData.user.email ?? undefined },
  };
}

/**
 * Verifies the caller (result of requireRole) may act on data belonging to
 * `tenantId`. Service-role callers and admins pass; mentors must own the tenant.
 */
export async function callerOwnsTenant(
  userId: string | undefined,
  tenantId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  if (userId === "service_role") return true;
  if (!tenantId) return false;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  const { data: tenant } = await admin
    .from("tenants")
    .select("owner_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenant?.owner_id === userId) return true;

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  return (roles || []).length > 0;
}
