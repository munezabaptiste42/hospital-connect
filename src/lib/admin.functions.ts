import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateStaffSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().min(1).max(120),
  role: z.enum(["admin", "doctor", "receptionist"]),
  specialization: z.string().max(120).optional().nullable(),
});

/** Admin creates a new staff account (doctor / receptionist / admin). */
export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateStaffSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin only");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, specialization: data.specialization ?? null },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    // Ensure profile values (trigger may not have meta yet in some cases)
    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      full_name: data.full_name,
      specialization: data.specialization ?? null,
    });

    return { ok: true, userId: created.user.id };
  });

/** Bootstrap: create first admin if no admin exists. Public on purpose. */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(72),
      full_name: z.string().min(1).max(120),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) throw new Error("An administrator already exists. Please sign in.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");

    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    await supabaseAdmin.from("profiles").upsert({ id: created.user.id, full_name: data.full_name });

    return { ok: true };
  });

/** Has the system been bootstrapped (any admin)? */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

/** List all staff (admin only). */
export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: caller } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!caller) throw new Error("Forbidden");

    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id, role, created_at").order("created_at", { ascending: false });
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, specialization");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const emailMap = new Map(users.users.map((u) => [u.id, u.email]));

    return (roles ?? []).map((r) => ({
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at,
      full_name: profileMap.get(r.user_id)?.full_name ?? "",
      specialization: profileMap.get(r.user_id)?.specialization ?? null,
      email: emailMap.get(r.user_id) ?? "",
    }));
  });

/** List doctors — used by receptionist for appointment assignment. */
export const listDoctors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: doctorRoles } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "doctor");
    const ids = (doctorRoles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, full_name, specialization").in("id", ids);
    return profiles ?? [];
  });
