import { demoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

export interface RepositoryConfig {
  url?: string;
  anonKey?: string;
  accessToken?: string;
  demo?: boolean;
}

export function getRepository(config: RepositoryConfig): { repository: Repository; mode: "demo" | "supabase" } {
  if (config.demo || (!config.url && !config.anonKey && !config.accessToken)) return { repository: demoRepository, mode: "demo" };
  if (!config.url || !config.anonKey || !config.accessToken) {
    throw new Error("Supabase requires a URL, anon key, and authenticated access token.");
  }
  return { repository: new SupabaseRepository(config.url, config.anonKey, config.accessToken), mode: "supabase" };
}
