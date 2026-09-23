/**
 * Compile course source files into per-course content packs + catalog.
 *
 * Run: bun scripts/compile-content.ts [course-id ...]
 * Example: bun scripts/compile-content.ts es-en fr-en
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

import { getLanguage } from "../content/languages";
import {
  catalogSchema,
  packSchema,
  unitSourceSchema,
  type Exercise,
  type LessonPack,
  type Pack,
  type Phrase,
  type UnitPack,
  type UnitSource,
  type Word,
} from "../content/schema";

const ROOT = join(import.meta.dir, "..");
const CONTENT = join(ROOT, "content");
const OUT_DIR = join(ROOT, "mobile/src/content/packs");
const CATALOG_FILE = join(ROOT, "mobile/src/content/catalog.json");

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistinct<T>(
  pool: T[],
  count: number,
  rand: () => number,
  exclude: (item: T) => boolean
): T[] {
  return shuffled(pool.filter((item) => !exclude(item)), rand).slice(0, count);
}

/** Copulas teach nothing as a fill-in answer; blank a content word instead. */
const CJK_COPULAS = new Set(["です", "でした", "예요", "이에요", "입니다", "이다"]);

function stripPunctuation(token: string) {
  return token.replace(/[.,!?¿¡;:"'、。！？]/g, "");
}

function tokenize(sentence: string) {
  return sentence.split(/\s+/).map(stripPunctuation).filter(Boolean);
}

function buildLesson(
  courseId: string,
  unitIndex: number,
  lessonIndex: number,
  focusWords: Word[],
  focusPhrases: Phrase[],
  unit: UnitSource,
  glueWords: Set<string>,
  cjk: boolean
): LessonPack {
  const rand = mulberry32(hashString(`${courseId}-u${unitIndex}-l${lessonIndex}`));
  const exercises: Exercise[] = [];
  const lessonId = `${courseId}:u${unitIndex}-l${lessonIndex}`;
  let n = 0;
  const eid = () => `${lessonId}-e${n++}`;

  for (const word of focusWords) {
    const distractors = pickDistinct(unit.words, 3, rand, (w) => w.target === word.target);
    const options = shuffled([word, ...distractors], rand);
    exercises.push({
      type: "select",
      id: eid(),
      mode: "targetToNative",
      prompt: word.target,
      audioTarget: word.target,
      options: options.map((w) => ({ text: w.native, emoji: w.emoji })),
      correct: options.findIndex((w) => w.target === word.target),
    });
  }

  for (const word of focusWords.slice(0, 2)) {
    const distractors = pickDistinct(unit.words, 3, rand, (w) => w.target === word.target);
    const options = shuffled([word, ...distractors], rand);
    exercises.push({
      type: "select",
      id: eid(),
      mode: "nativeToTarget",
      prompt: word.native,
      audioTarget: word.target,
      options: options.map((w) => ({ text: w.target, emoji: w.emoji })),
      correct: options.findIndex((w) => w.target === word.target),
    });
  }

  const listenWord = focusWords[lessonIndex % focusWords.length];
  {
    const distractors = pickDistinct(unit.words, 3, rand, (w) => w.target === listenWord.target);
    const options = shuffled([listenWord, ...distractors], rand);
    exercises.push({
      type: "select",
      id: eid(),
      mode: "listen",
      prompt: "Tap what you hear",
      audioTarget: listenWord.target,
      options: options.map((w) => ({ text: w.target })),
      correct: options.findIndex((w) => w.target === listenWord.target),
    });
  }

  const allNativeTokens = [...new Set(unit.phrases.flatMap((p) => tokenize(p.native)))];
  for (const phrase of focusPhrases) {
    const answer = tokenize(phrase.native);
    const answerLower = new Set(answer.map((t) => t.toLowerCase()));
    const distractorTokens = pickDistinct(allNativeTokens, 3, rand, (t) =>
      answerLower.has(t.toLowerCase())
    );
    exercises.push({
      type: "wordBank",
      id: eid(),
      direction: "targetToNative",
      prompt: phrase.target,
      audioTarget: phrase.target,
      tokens: shuffled([...answer, ...distractorTokens], rand),
      answer,
    });
  }

  const fillPhrase = focusPhrases[0];
  if (fillPhrase) {
    const tokens = fillPhrase.target.split(/\s+/);
    const unitTargets = [...new Set(unit.words.map((w) => w.target))];
    // `blank` is the answer; `sentence` has it replaced by ___.
    let blank: { correctWord: string; sentence: string; distractorPool: string[] } | null = null;

    // CJK particles attach to words (わたしは, 학생이에요) and zh/ja often have no
    // spaces at all, so blank a unit word found inside the phrase instead of a
    // whitespace token. Longest match first avoids blanking 女 inside 女の人.
    const inPhrase = cjk
      ? unitTargets
          .filter((w) => fillPhrase.target.includes(w))
          .filter((w, _, all) => !all.some((o) => o !== w && o.includes(w)))
          .filter((w) => !CJK_COPULAS.has(w))
      : [];
    if (inPhrase.length > 0) {
      {
        // Prefer the longest (most contentful) word; random among ties.
        const longest = Math.max(...inPhrase.map((w) => w.length));
        const top = inPhrase.filter((w) => w.length === longest);
        const word = top[Math.floor(rand() * top.length)];
        blank = {
          correctWord: word,
          sentence: fillPhrase.target.replace(word, "___"),
          distractorPool: unitTargets.filter((w) => !fillPhrase.target.includes(w)),
        };
      }
    } else if (!cjk || tokens.length > 1) {
      const candidates = tokens
        .map((token, index) => ({
          token,
          index,
          clean: stripPunctuation(token).toLowerCase(),
        }))
        // Skip elisions (l'acqua, s'appelle): stripping the apostrophe would
        // make both the blank and the answer option misspelled.
        .filter(
          (t) =>
            tokens.length > 1 &&
            !/['’]/.test(t.token) &&
            t.clean.length > (cjk ? 1 : 3) &&
            !glueWords.has(t.clean)
        );
      if (candidates.length > 0) {
        const target = candidates[Math.floor(rand() * candidates.length)];
        const correctWord = stripPunctuation(tokens[target.index]);
        blank = {
          correctWord,
          sentence: tokens
            .map((t, i) => (i === target.index ? t.replace(stripPunctuation(t), "___") : t))
            .join(" "),
          distractorPool: [...new Set(unit.words.map((w) => w.target.split(" ").pop()!))],
        };
      }
    }

    if (blank) {
      const { correctWord, sentence } = blank;
      const options = shuffled(
        [
          correctWord,
          ...pickDistinct(
            blank.distractorPool,
            3,
            rand,
            (w) => w.toLowerCase() === correctWord.toLowerCase()
          ),
        ],
        rand
      );
      exercises.push({
        type: "fillBlank",
        id: eid(),
        sentence,
        translation: fillPhrase.native,
        audioTarget: fillPhrase.target,
        options,
        correct: options.findIndex((o) => o === correctWord),
      });
    }
  }

  {
    const padding = pickDistinct(unit.words, 5 - Math.min(focusWords.length, 5), rand, (w) =>
      focusWords.some((f) => f.target === w.target)
    );
    const pairWords = [...focusWords.slice(0, 5), ...padding].slice(0, 5);
    exercises.push({
      type: "match",
      id: eid(),
      pairs: pairWords.map((w) => ({ target: w.target, native: w.native })),
    });
  }

  const typePhrase = focusPhrases[focusPhrases.length - 1];
  if (typePhrase) {
    const alts: string[] = [];
    if (typePhrase.romanization) alts.push(typePhrase.romanization);
    exercises.push({
      type: "typeAnswer",
      id: eid(),
      mode: "translate",
      prompt: typePhrase.target,
      audioTarget: typePhrase.target,
      answer: typePhrase.native,
      alternatives: alts,
    });
  }

  return { id: lessonId, title: `Lesson ${lessonIndex + 1}`, exercises };
}

function buildUnit(
  courseId: string,
  unitIndex: number,
  source: UnitSource,
  glueWords: Set<string>,
  cjk: boolean
): UnitPack {
  const lessons: LessonPack[] = [];
  const wordsPerLesson = 3;
  const lessonCount = Math.floor(source.words.length / wordsPerLesson);
  const phrasesPerLesson = Math.max(2, Math.floor(source.phrases.length / lessonCount));

  for (let i = 0; i < lessonCount; i++) {
    const focusWords = source.words.slice(i * wordsPerLesson, (i + 1) * wordsPerLesson);
    const focusPhrases = source.phrases.slice(
      i * phrasesPerLesson,
      (i + 1) * phrasesPerLesson
    );
    lessons.push(
      buildLesson(courseId, unitIndex, i, focusWords, focusPhrases, source, glueWords, cjk)
    );
  }

  return {
    id: `${courseId}:unit-${unitIndex + 1}`,
    title: source.title,
    description: source.description,
    guidebook: source.guidebook,
    words: source.words,
    lessons,
  };
}

function compileCourse(courseId: string): Pack {
  const targetCode = courseId.split("-")[0];
  const lang = getLanguage(targetCode);
  const unitsDir = join(CONTENT, courseId, "units");

  if (!existsSync(unitsDir)) {
    throw new Error(`No units dir: ${unitsDir}`);
  }

  const files = readdirSync(unitsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error(`No unit files in ${unitsDir}`);

  const glueWords = new Set(lang.glueWords);
  const units: UnitPack[] = files.map((file, index) => {
    const raw = JSON.parse(readFileSync(join(unitsDir, file), "utf8"));
    const parsed = unitSourceSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid ${file}: ${JSON.stringify(parsed.error.issues)}`);
    }
    return buildUnit(courseId, index, parsed.data, glueWords, !!lang.cjk);
  });

  return packSchema.parse({
    id: courseId,
    version: 1,
    targetLanguage: lang.name,
    targetCode: lang.code,
    nativeLanguage: "English",
    nativeCode: "en",
    flag: lang.flag,
    sections: [{ id: `${courseId}:section-1`, title: "Section 1: Beginner", units }],
  });
}

function main() {
  const requested = process.argv.slice(2);
  const courseDirs = readdirSync(CONTENT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.endsWith("-en"))
    .map((d) => d.name)
    .sort();

  const targets = requested.length
    ? courseDirs.filter((id) => requested.some((r) => id.startsWith(r)))
    : courseDirs;

  if (targets.length === 0) {
    console.error("No courses found. Create content/{code}-en/units/*.json");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const catalogCourses = [];

  for (const courseId of targets) {
    const pack = compileCourse(courseId);
    writeFileSync(join(OUT_DIR, `${courseId}.json`), JSON.stringify(pack, null, 2));
    const lessonCount = pack.sections.reduce(
      (s, sec) => s + sec.units.reduce((u, unit) => u + unit.lessons.length, 0),
      0
    );
    const exerciseCount = pack.sections.reduce(
      (s, sec) =>
        s +
        sec.units.reduce(
          (u, unit) => u + unit.lessons.reduce((l, les) => l + les.exercises.length, 0),
          0
        ),
      0
    );
    catalogCourses.push({
      id: pack.id,
      targetLanguage: pack.targetLanguage,
      targetCode: pack.targetCode,
      nativeLanguage: pack.nativeLanguage,
      flag: pack.flag,
      unitCount: pack.sections.reduce((s, sec) => s + sec.units.length, 0),
      lessonCount,
    });
    console.log(
      `${courseId}: ${pack.sections[0].units.length} units, ${lessonCount} lessons, ${exerciseCount} exercises`
    );
  }

  const catalog = catalogSchema.parse({ version: 1, courses: catalogCourses });
  writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));

  // Auto-generate pack index for Metro static imports.
  const indexLines = [
    `// Generated by scripts/compile-content.ts — do not edit.`,
    ...targets.map((id) => `import ${id.replace("-", "_")} from "./${id}.json";`),
    `import type { Pack } from "../../lib/types";`,
    ``,
    `export const PACKS: Record<string, Pack> = {`,
    ...targets.map((id) => `  "${id}": ${id.replace("-", "_")} as Pack,`),
    `};`,
    ``,
  ];
  writeFileSync(join(OUT_DIR, "index.ts"), indexLines.join("\n"));

  console.log(`Wrote catalog with ${catalogCourses.length} courses.`);
}

main();
