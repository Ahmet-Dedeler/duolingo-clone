import { z } from "zod";

/**
 * Source format — what content authors produce, one file per unit.
 * `target` = word/phrase in the language being learned.
 * `native` = English translation.
 */

export const wordSchema = z.object({
  target: z.string().min(1),
  native: z.string().min(1),
  emoji: z.string().min(1),
  /** Romaji / pinyin for CJK languages — used as typing alternatives. */
  romanization: z.string().optional(),
});

export const phraseSchema = z.object({
  target: z.string().min(1),
  native: z.string().min(1),
  romanization: z.string().optional(),
});

export const unitSourceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  guidebook: z.string().min(1),
  words: z.array(wordSchema).min(8),
  phrases: z.array(phraseSchema).min(8),
});

export type UnitSource = z.infer<typeof unitSourceSchema>;
export type Word = z.infer<typeof wordSchema>;
export type Phrase = z.infer<typeof phraseSchema>;

export const exerciseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("select"),
    id: z.string(),
    mode: z.enum(["targetToNative", "nativeToTarget", "listen"]),
    prompt: z.string(),
    audioTarget: z.string().optional(),
    options: z.array(
      z.object({ text: z.string(), emoji: z.string().optional() })
    ),
    correct: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("wordBank"),
    id: z.string(),
    direction: z.enum(["targetToNative", "nativeToTarget"]),
    prompt: z.string(),
    audioTarget: z.string().optional(),
    tokens: z.array(z.string()),
    answer: z.array(z.string()),
  }),
  z.object({
    type: z.literal("match"),
    id: z.string(),
    pairs: z.array(z.object({ target: z.string(), native: z.string() })),
  }),
  z.object({
    type: z.literal("typeAnswer"),
    id: z.string(),
    mode: z.enum(["translate", "listen"]),
    prompt: z.string(),
    audioTarget: z.string().optional(),
    answer: z.string(),
    alternatives: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("fillBlank"),
    id: z.string(),
    sentence: z.string(),
    translation: z.string(),
    audioTarget: z.string().optional(),
    options: z.array(z.string()),
    correct: z.number().int().nonnegative(),
  }),
]);

export const lessonPackSchema = z.object({
  id: z.string(),
  title: z.string(),
  exercises: z.array(exerciseSchema).min(4),
});

export const unitPackSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  guidebook: z.string(),
  words: z.array(wordSchema),
  lessons: z.array(lessonPackSchema).min(1),
});

export const sectionPackSchema = z.object({
  id: z.string(),
  title: z.string(),
  units: z.array(unitPackSchema).min(1),
});

export const packSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  targetLanguage: z.string(),
  targetCode: z.string(),
  nativeLanguage: z.string(),
  nativeCode: z.string(),
  flag: z.string(),
  sections: z.array(sectionPackSchema).min(1),
});

export const catalogSchema = z.object({
  version: z.number().int(),
  courses: z.array(
    z.object({
      id: z.string(),
      targetLanguage: z.string(),
      targetCode: z.string(),
      nativeLanguage: z.string(),
      flag: z.string(),
      unitCount: z.number().int(),
      lessonCount: z.number().int(),
    })
  ),
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type LessonPack = z.infer<typeof lessonPackSchema>;
export type UnitPack = z.infer<typeof unitPackSchema>;
export type Pack = z.infer<typeof packSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
