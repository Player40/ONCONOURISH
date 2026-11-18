import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for seeding a dedicated test database.");

const generated = spawnSync(process.execPath, [fileURLToPath(new URL("./seed.mjs", import.meta.url))], {
  encoding: "utf8",
});
if (generated.error) throw generated.error;
if (generated.status !== 0) throw new Error(`Seed generation failed: ${generated.stderr}`);

const applied = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1"], {
  env: { ...process.env, PGDATABASE: databaseUrl },
  input: generated.stdout,
  encoding: "utf8",
});
if (applied.error) throw applied.error;
process.stdout.write(applied.stdout);
if (applied.status !== 0) {
  process.stderr.write(applied.stderr);
  throw new Error(`Seed application failed (exit ${applied.status}).`);
}
