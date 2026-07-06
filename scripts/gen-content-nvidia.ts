/**
 * Generate course unit source files via NVIDIA MiniMax-M3.
 *
 * Usage:
 *   NVIDIA_API_KEY=nvapi-... bun scripts/gen-content-nvidia.ts [course-id] [unit-slug ...]
 *
 * Examples:
 *   bun scripts/gen-content-nvidia.ts fr-en              # all missing units for French
 *   bun scripts/gen-content-nvidia.ts ja-en 01-basics     # one unit
 */
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import { COURSES, getLanguage, UNIT_TOPICS, type LanguageConfig } from "../content/languages";

const ROOT = join(import.meta.dir, "..");
const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "minimaxai/minimax-m3";

function systemPrompt(lang: LanguageConfig): string {
  const cjkNote = lang.cjk
    ? `\n- This is a ${lang.name} course using ${lang.code === "ja" ? "hiragana/katakana/kanji" : lang.code === "ko" ? "Hangul" : "simplified Chinese characters"}.
- Include "romanization" on every word and phrase (${lang.code === "ja" ? "romaji" : lang.code === "ko" ? "revised romanization" : "pinyin with tone marks"}).
- Phrases must use natural, correct ${lang.name} grammar.`
    : `\n- Include correct articles/gender for nouns per ${lang.name} grammar rules.
- Phrases must use natural, correct ${lang.name} grammar and word order.`;

  return `You are an expert ${lang.name} teacher creating Duolingo-style course content for English speakers.
Output ONLY a single JSON object. No markdown fences, no commentary.
Shape:
{
  "title": string,
  "description": string,
  "guidebook": string,
  "words": [ { "target": string, "native": string, "emoji": string${lang.cjk ? ', "romanization": string' : ""} } ],
  "phrases": [ { "target": string, "native": string${lang.cjk ? ', "romanization": string' : ""} } ]
}
Rules:
- words: exactly 12 entries. Concrete beginner vocabulary in ${lang.name}. "native" is the English translation (include "the" for nouns). One fitting emoji per word.
- phrases: exactly 10 entries. Short (3-7 word) natural ${lang.name} sentences with faithful English translations.
- guidebook: ~120 words of friendly markdown grammar/usage notes for this unit.
- No duplicate words. Valid JSON only. Double quotes only.
- ACCURACY IS CRITICAL: every word, article, particle, and conjugation must be correct native ${lang.name}.${cjkNote}`;
}

async function generateUnit(
  lang: LanguageConfig,
  topic: (typeof UNIT_TOPICS)[number]
): Promise<object> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("Set NVIDIA_API_KEY env var");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt(lang) },
        {
          role: "user",
          content: `Generate the unit titled "${topic.title}" for ${lang.name}. Focus: ${topic.brief}`,
        },
      ],
      max_tokens: 8192,
      temperature: 0.3,
      top_p: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NVIDIA API ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  let raw = data.choices[0]?.message?.content?.trim() ?? "";
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(raw);
}

async function main() {
  const args = process.argv.slice(2);
  const courseId = args[0]?.includes("-en") ? args.shift()! : undefined;
  const unitFilter = args;

  const courses = courseId
    ? COURSES.filter((c) => c.id === courseId || c.id.startsWith(courseId!))
    : COURSES.filter((c) => c.id !== "es-en"); // skip Spanish by default

  if (courses.length === 0) {
    console.error("No matching courses.");
    process.exit(1);
  }

  // Generate 5 core units for new languages; Spanish already has 10.
  const defaultTopics = UNIT_TOPICS.slice(0, 5);

  for (const course of courses) {
    const lang = getLanguage(course.targetCode);
    const outDir = join(ROOT, "content", course.id, "units");
    mkdirSync(outDir, { recursive: true });

    const topics = unitFilter.length
      ? UNIT_TOPICS.filter((t) => unitFilter.some((f) => t.slug.startsWith(f)))
      : defaultTopics;

    for (const topic of topics) {
      const out = join(outDir, `${topic.slug}.json`);
      if (existsSync(out) && unitFilter.length === 0) {
        console.log(`Skip ${course.id}/${topic.slug} (exists)`);
        continue;
      }
      console.log(`Generating ${course.id}/${topic.slug} (${lang.name})...`);
      const start = Date.now();
      try {
        const json = await generateUnit(lang, topic);
        writeFileSync(out, JSON.stringify(json, null, 2) + "\n");
        console.log(`OK (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      } catch (err) {
        console.error(`FAILED ${course.id}/${topic.slug}:`, err);
        process.exitCode = 1;
      }
    }
  }
}

main();
