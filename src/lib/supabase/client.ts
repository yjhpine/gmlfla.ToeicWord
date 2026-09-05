import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 빌드/로컬에서 env 없어도 모듈 로드는 되게 두고, 실제 호출 시 에러
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다.",
  );
}

export const supabase = createClient(
  url ?? "http://127.0.0.1:54321",
  anonKey ?? "public-anon-key",
);
