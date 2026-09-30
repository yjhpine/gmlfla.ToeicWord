import type { DayWordbook, WordEntry } from "@/lib/words/types";

export type LookupSource = "local" | "dictionary";

export type LookupResult = {
  word: string;
  meaning: string;
  meaningEn: string;
  example: string;
  exampleMeaning: string;
  explanation: string;
  source: LookupSource;
  partOfSpeech: string;
  day: number | null;
};

type DictDefinition = {
  definition?: string;
  example?: string;
};

type DictMeaning = {
  partOfSpeech?: string;
  definitions?: DictDefinition[];
};

type DictEntry = {
  word?: string;
  meanings?: DictMeaning[];
};

function normalizeWord(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findLocalWord(
  books: DayWordbook[],
  query: string,
): LookupResult | null {
  const needle = normalizeWord(query);
  if (!needle) return null;

  for (const book of books) {
    for (const entry of book.words) {
      if (normalizeWord(entry.word) !== needle) continue;
      return buildLocalResult(entry, book.day);
    }
  }
  return null;
}

function buildLocalResult(entry: WordEntry, day: number): LookupResult {
  const explanation = [
    `「${entry.word}」는 단어장 Day ${day}에 등록된 단어입니다.`,
    `뜻: ${entry.meaning}`,
    entry.example ? `예문: ${entry.example}` : "",
    entry.exampleMeaning ? `예문 해석: ${entry.exampleMeaning}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    word: entry.word,
    meaning: entry.meaning,
    meaningEn: "",
    example: entry.example,
    exampleMeaning: entry.exampleMeaning ?? "",
    explanation,
    source: "local",
    partOfSpeech: "",
    day,
  };
}

async function translateToKorean(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", trimmed.slice(0, 450));
    url.searchParams.set("langpair", "en|ko");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim() ?? "";
    if (!translated || /MYMEMORY WARNING/i.test(translated)) return "";
    return translated;
  } catch {
    return "";
  }
}

function pickDefinition(entry: DictEntry): {
  partOfSpeech: string;
  definition: string;
  example: string;
} | null {
  for (const meaning of entry.meanings ?? []) {
    for (const def of meaning.definitions ?? []) {
      if (!def.definition) continue;
      return {
        partOfSpeech: meaning.partOfSpeech ?? "",
        definition: def.definition,
        example: def.example ?? "",
      };
    }
  }
  return null;
}

export async function lookupDictionary(query: string): Promise<LookupResult | null> {
  const needle = normalizeWord(query);
  if (!needle || !/^[a-z][a-z\-\s']{0,48}$/i.test(needle)) return null;

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(needle)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let data: DictEntry[];
  try {
    data = (await res.json()) as DictEntry[];
  } catch {
    return null;
  }

  const entry = data[0];
  if (!entry) return null;
  const picked = pickDefinition(entry);
  if (!picked) return null;

  const [meaningKo, exampleKo] = await Promise.all([
    translateToKorean(picked.definition),
    picked.example ? translateToKorean(picked.example) : Promise.resolve(""),
  ]);

  const word = entry.word ?? needle;
  const posLabel = picked.partOfSpeech
    ? `품사: ${picked.partOfSpeech}. `
    : "";
  const meaning = meaningKo || picked.definition;
  const explanation = [
    `「${word}」 ${posLabel}영어 사전에서 찾은 해설입니다.`,
    `뜻(영): ${picked.definition}`,
    meaningKo ? `뜻(한): ${meaningKo}` : "",
    picked.example ? `예문: ${picked.example}` : "예문은 사전에서 찾지 못했어요.",
    exampleKo ? `예문 해석: ${exampleKo}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    word,
    meaning,
    meaningEn: picked.definition,
    example: picked.example,
    exampleMeaning: exampleKo,
    explanation,
    source: "dictionary",
    partOfSpeech: picked.partOfSpeech,
    day: null,
  };
}
