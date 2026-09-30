import { NextResponse } from "next/server";
import { getAllDayWordbooks } from "@/lib/words/load";
import { findLocalWord, lookupDictionary } from "@/lib/words/lookup";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = (searchParams.get("word") ?? "").trim();

  if (!word) {
    return NextResponse.json(
      { error: "단어를 입력해 주세요." },
      { status: 400 },
    );
  }

  if (word.length > 48) {
    return NextResponse.json(
      { error: "단어가 너무 깁니다. 48자 이내로 입력해 주세요." },
      { status: 400 },
    );
  }

  const books = getAllDayWordbooks();
  const local = findLocalWord(books, word);
  if (local) {
    return NextResponse.json({ result: local });
  }

  const remote = await lookupDictionary(word);
  if (remote) {
    return NextResponse.json({ result: remote });
  }

  return NextResponse.json(
    {
      error: `"${word}"에 대한 뜻·예문을 찾지 못했어요. 철자를 확인해 주세요.`,
    },
    { status: 404 },
  );
}
