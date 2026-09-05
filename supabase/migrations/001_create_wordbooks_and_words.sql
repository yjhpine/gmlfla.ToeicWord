-- 희림 토익 단어장: 날짜(day)별 단어북 + 단어
-- Supabase SQL Editor 또는 CLI로 적용

create extension if not exists "pgcrypto";

create table if not exists public.wordbooks (
  id uuid primary key default gen_random_uuid(),
  day integer not null unique check (day >= 1),
  date date,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  wordbook_id uuid not null references public.wordbooks (id) on delete cascade,
  word text not null,
  meaning text not null,
  example text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists words_wordbook_id_idx on public.words (wordbook_id);
create index if not exists words_word_idx on public.words (word);

alter table public.wordbooks enable row level security;
alter table public.words enable row level security;

-- 초기: 인증 사용자 읽기/쓰기 (나중에 정책 세분화 가능)
create policy "wordbooks_select_authenticated"
  on public.wordbooks for select
  to authenticated
  using (true);

create policy "wordbooks_insert_authenticated"
  on public.wordbooks for insert
  to authenticated
  with check (true);

create policy "wordbooks_update_authenticated"
  on public.wordbooks for update
  to authenticated
  using (true)
  with check (true);

create policy "words_select_authenticated"
  on public.words for select
  to authenticated
  using (true);

create policy "words_insert_authenticated"
  on public.words for insert
  to authenticated
  with check (true);

create policy "words_update_authenticated"
  on public.words for update
  to authenticated
  using (true)
  with check (true);

create policy "words_delete_authenticated"
  on public.words for delete
  to authenticated
  using (true);
