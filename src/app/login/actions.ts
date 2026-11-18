"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, DEMO_COOKIE, authConfig, cookieOptions, demoEnabled } from "@/lib/session";
import { SupabaseRepository } from "@/lib/supabase-repository";
import type { AppRole } from "@/data/roles";
import { isRecord } from "@/lib/workflow-input";

function roleHome(role: AppRole): string {
  if (role === "patient") return "/patient";
  if (role === "caregiver") return "/caregiver";
  return "/clinician";
}

export async function enterClinicianDemo() {
  if (!demoEnabled()) redirect("/login");
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.set(DEMO_COOKIE, "synthetic", cookieOptions);
  redirect("/clinician");
}

export async function enterPatientDemo() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(DEMO_COOKIE);
  redirect("/patient");
}

export async function enterCaregiverDemo() {
  if (!demoEnabled()) redirect("/login");
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.set(DEMO_COOKIE, "synthetic-caregiver", cookieOptions);
  redirect("/caregiver");
}

export async function signIn(form: FormData) {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.delete(ACCESS_COOKIE);
  const config = authConfig();
  const email = form.get("email");
  const password = form.get("password");
  if (!config || typeof email !== "string" || email.length > 254 || !email ||
      typeof password !== "string" || !password || password.length > 1024) redirect("/login?error=credentials");
  const response = await fetch(`${config.origin}/auth/v1/token?grant_type=password`, {
    method: "POST", cache: "no-store", redirect: "error",
    headers: { apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (!response?.ok) redirect("/login?error=credentials");
  const data: unknown = await response.json().catch(() => null);
  if (!isRecord(data) || !isRecord(data.user) ||
      typeof data.access_token !== "string" || !/^[\w.-]+$/.test(data.access_token) ||
      data.access_token.length > 3800 || typeof data.expires_in !== "number" ||
      !Number.isInteger(data.expires_in) || data.expires_in <= 0 ||
      typeof data.user.id !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(data.user.id)) {
    redirect("/login?error=credentials");
  }
  let role: AppRole | null;
  try {
    role = await new SupabaseRepository(config.origin, config.key, data.access_token).getRole(data.user.id);
  } catch {
    redirect("/login?error=verify");
  }
  if (!role) {
    redirect("/login?error=profile");
  }
  jar.set(ACCESS_COOKIE, data.access_token, { ...cookieOptions, maxAge: Math.min(data.expires_in, 3600) });
  redirect(roleHome(role));
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.delete(ACCESS_COOKIE);
  redirect("/login");
}
