// Resolves the mentor's contact email for a tenant.
// `tenants.email` is optional (many tenants never filled it in), so we fall
// back to the auth account email of the tenant owner.
export async function resolveMentorEmail(
  supabase: any,
  tenantId: string,
): Promise<{ email: string; name: string; slug: string }> {
  const { data: tn } = await supabase
    .from("tenants")
    .select("owner_id, slug, name, email, first_name")
    .eq("id", tenantId)
    .maybeSingle();

  let email: string = (tn as any)?.email || "";
  if (!email && (tn as any)?.owner_id) {
    try {
      const { data: u } = await supabase.auth.admin.getUserById((tn as any).owner_id);
      email = u?.user?.email || "";
    } catch (e) {
      console.error("resolveMentorEmail: owner lookup failed", e);
    }
  }

  return {
    email,
    name: (tn as any)?.first_name || (tn as any)?.name || "",
    slug: (tn as any)?.slug || "",
  };
}
