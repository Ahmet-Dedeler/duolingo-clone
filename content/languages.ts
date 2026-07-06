/** Language metadata for content generation, compilation, and TTS. */

/** Marie - Neutral (fr_fr). Voxtral cross-lingual works for es/de/it/pt too. */
export const MISTRAL_VOICE_EU = "5a271406-039d-46fe-835b-fbbb00eaf08d";

export type LanguageConfig = {
  code: string;
  name: string;
  flag: string;
  ttsLocale: string;
  /** Mistral Voxtral voice_id UUID. Empty = Edge TTS only. */
  mistralVoice: string;
  /** Edge TTS neural voice (ja/ko/zh — Mistral has no native voices for these). */
  edgeVoice?: string;
  glueWords: string[];
  cjk?: boolean;
};

export const LANGUAGES: Record<string, LanguageConfig> = {
  es: {
    code: "es",
    name: "Spanish",
    flag: "🇪🇸",
    ttsLocale: "es-ES",
    mistralVoice: MISTRAL_VOICE_EU,
    glueWords: [
      "el", "la", "los", "las", "un", "una", "es", "son", "y", "o", "no",
      "de", "del", "a", "al", "en", "que", "me", "te", "se", "yo", "tu",
    ],
  },
  fr: {
    code: "fr",
    name: "French",
    flag: "🇫🇷",
    ttsLocale: "fr-FR",
    mistralVoice: MISTRAL_VOICE_EU,
    glueWords: [
      "le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "ne",
      "je", "tu", "il", "elle", "nous", "vous", "est", "sont", "dans", "à",
    ],
  },
  de: {
    code: "de",
    name: "German",
    flag: "🇩🇪",
    ttsLocale: "de-DE",
    mistralVoice: MISTRAL_VOICE_EU,
    glueWords: [
      "der", "die", "das", "den", "dem", "ein", "eine", "einen", "und", "oder",
      "nicht", "ich", "du", "er", "sie", "wir", "ist", "sind", "in", "zu",
    ],
  },
  it: {
    code: "it",
    name: "Italian",
    flag: "🇮🇹",
    ttsLocale: "it-IT",
    mistralVoice: MISTRAL_VOICE_EU,
    glueWords: [
      "il", "lo", "la", "i", "gli", "le", "un", "una", "e", "o", "non",
      "io", "tu", "lui", "lei", "è", "sono", "di", "in", "che", "mi",
    ],
  },
  pt: {
    code: "pt",
    name: "Portuguese",
    flag: "🇧🇷",
    ttsLocale: "pt-BR",
    mistralVoice: MISTRAL_VOICE_EU,
    glueWords: [
      "o", "a", "os", "as", "um", "uma", "e", "ou", "não", "de", "do", "da",
      "eu", "tu", "ele", "ela", "é", "são", "em", "que", "me", "se",
    ],
  },
  ja: {
    code: "ja",
    name: "Japanese",
    flag: "🇯🇵",
    ttsLocale: "ja-JP",
    mistralVoice: "",
    edgeVoice: "ja-JP-NanamiNeural",
    cjk: true,
    glueWords: [
      "は", "が", "を", "に", "で", "と", "の", "も", "か", "ね", "よ", "です", "ます",
    ],
  },
  ko: {
    code: "ko",
    name: "Korean",
    flag: "🇰🇷",
    ttsLocale: "ko-KR",
    mistralVoice: "",
    edgeVoice: "ko-KR-SunHiNeural",
    cjk: true,
    glueWords: [
      "은", "는", "이", "가", "을", "를", "에", "에서", "와", "과", "의", "도", "요",
    ],
  },
  zh: {
    code: "zh",
    name: "Chinese",
    flag: "🇨🇳",
    ttsLocale: "zh-CN",
    mistralVoice: "",
    edgeVoice: "zh-CN-XiaoxiaoNeural",
    cjk: true,
    glueWords: [
      "的", "了", "是", "在", "我", "你", "他", "她", "们", "不", "有", "和", "吗",
    ],
  },
};

export type CourseConfig = {
  id: string;
  targetCode: string;
  nativeCode: string;
};

export const COURSES: CourseConfig[] = Object.values(LANGUAGES).map((lang) => ({
  id: `${lang.code}-en`,
  targetCode: lang.code,
  nativeCode: "en",
}));

export function getLanguage(code: string): LanguageConfig {
  const lang = LANGUAGES[code];
  if (!lang) throw new Error(`Unknown language: ${code}`);
  return lang;
}

export function getCourse(id: string): CourseConfig {
  const course = COURSES.find((c) => c.id === id);
  if (!course) throw new Error(`Unknown course: ${id}`);
  return course;
}

export const UNIT_TOPICS = [
  {
    slug: "01-basics",
    title: "Basics 1",
    brief:
      "Core first words: man, woman, boy, girl, apple, bread, water, milk; basic sentences with to be / eat / drink.",
  },
  {
    slug: "02-greetings",
    title: "Greetings",
    brief:
      "Hello and goodbye, please, thank you, good morning/night, how are you, polite basics.",
  },
  {
    slug: "03-food",
    title: "Food",
    brief:
      "Common food and drink: coffee, rice, egg, cheese, fruit, juice; wanting/eating/drinking.",
  },
  {
    slug: "04-animals",
    title: "Animals",
    brief:
      "Common animals: dog, cat, horse, bird, fish, cow; simple descriptions.",
  },
  {
    slug: "05-travel",
    title: "Travel",
    brief:
      "Getting around: city, train, hotel, airport, street, museum; asking where things are.",
  },
  {
    slug: "06-family",
    title: "Family",
    brief:
      "Family members: mother, father, sister, brother, grandmother, grandfather, baby.",
  },
  {
    slug: "07-shopping",
    title: "Shopping",
    brief: "Stores, money, prices, buying: shop, market, expensive, cheap, how much.",
  },
  {
    slug: "08-weather",
    title: "Weather",
    brief: "Weather and seasons: sun, rain, snow, hot, cold, wind, summer, winter.",
  },
  {
    slug: "09-work",
    title: "Work & School",
    brief: "Jobs and school: teacher, doctor, student, office, class, homework.",
  },
  {
    slug: "10-health",
    title: "Health",
    brief: "Body and health: head, hand, sick, tired, medicine, hospital.",
  },
] as const;
