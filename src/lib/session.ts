import { cookies } from "next/headers";
import type { AppRole } from "@/data/roles";
import { demoRepository, DEMO_CAREGIVER, DEMO_CLINICIAN } from "./demo-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

export interface Session {
  actorId: string;
  role: AppRole;
  mode: "demo" | "supabase";
  repository: Repository;
}

export const ACCESS_COOKIE = "onconourish_access";
export const DEMO_COOKIE = "onconourish_demo_clinician";
export const cookieOptions = {
  httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
} as const;
export const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" &&
      !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
    throw new Error("Invalid Supabase endpoint.");
  }
  return { origin: parsed.origin, key };
}

export function demoEnabled() {
  return process.env.NEXT_PUBLIC_DEMO === "true" || (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getSession(request?: Request): Promise<Session | null> {
  const authorization = request?.headers.get("authorization");
  const jar = authorization == null ? await cookies() : undefined;
  const token = authorization == null
    ? jar?.get(ACCESS_COOKIE)?.value
    : /^Bearer ([\w.-]+)$/i.exec(authorization)?.[1];
  if (authorization != null || token) {
    const config = authConfig();
    if (!token || !config || token.length > 8192) return null;
    const response = await fetch(`${config.origin}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      redirect: "error", cache: "no-store",
    });
    if ([400, 401, 403].includes(response.status)) return null;
    if (!response.ok) throw new Error("Session verification unavailable.");
    const user = await response.json();
    if (typeof user?.id !== "string" || !UUID.test(user.id)) return null;
    const repository = new SupabaseRepository(config.origin, config.key, token, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const role = await repository.getRole(user.id);
    return role ? { actorId: user.id, role, repository, mode: "supabase" } : null;
  }
  if (demoEnabled()) {
    const demoRole = jar?.get(DEMO_COOKIE)?.value;
    if (demoRole === "synthetic-caregiver") {
      return { actorId: DEMO_CAREGIVER, role: "caregiver", repository: demoRepository, mode: "demo" };
    }
    if (demoRole === "synthetic" || demoRole === "synthetic-clinician") {
      return { actorId: DEMO_CLINICIAN, role: "clinician", repository: demoRepository, mode: "demo" };
    }
  }
  return null;
}

export async function hasAccessCookie(): Promise<boolean> {
  return Boolean((await cookies()).get(ACCESS_COOKIE)?.value);
}
