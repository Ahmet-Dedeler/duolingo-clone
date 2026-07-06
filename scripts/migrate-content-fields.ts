/**
 * One-time migration: rename es/en → target/native in unit source files.
 * Run: bun scripts/migrate-content-fields.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const CONTENT = join(ROOT, "content");

function migrateUnit(raw: Record<string, unknown>) {
  const migrateWord = (w: Record<string, unknown>) => ({
    target: w.target ?? w.es,
    native: w.native ?? w.en,
    emoji: w.emoji,
    ...(w.romanization ? { romanization: w.romanization } : {}),
  });
  const migratePhrase = (p: Record<string, unknown>) => ({
    target: p.target ?? p.es,
    native: p.native ?? p.en,
    ...(p.romanization ? { romanization: p.romanization } : {}),
  });
  return {
    title: raw.title,
    description: raw.description,
    guidebook: raw.guidebook,
    words: (raw.words as Record<string, unknown>[]).map(migrateWord),
    phrases: (raw.phrases as Record<string, unknown>[]).map(migratePhrase),
  };
}

for (const entry of readdirSync(CONTENT, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.endsWith("-en")) continue;
  const unitsDir = join(CONTENT, entry.name, "units");
  for (const file of readdirSync(unitsDir).filter((f) => f.endsWith(".json"))) {
    const path = join(unitsDir, file);
    const raw = JSON.parse(readFileSync(path, "utf8"));
    writeFileSync(path, JSON.stringify(migrateUnit(raw), null, 2) + "\n");
    console.log(`Migrated ${entry.name}/units/${file}`);
  }
}

console.log("Done.");
