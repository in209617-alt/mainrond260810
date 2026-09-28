-- ═════════════════════════════════════════════════════════════
-- schema.sql — 데이터베이스 표(테이블)와 보안 규칙
--
-- 사용법 (README 3단계):
--   1) 아래 [관리자 이메일] 부분의 이메일을 "내 이메일"로 바꾼다
--   2) Supabase → SQL Editor → New query 에 이 파일 전체를 붙여넣고 Run
--
-- 여러 번 실행해도 안전합니다. (이미 있는 표는 그대로 두고, 보안 규칙만 다시 적용)
-- ═════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- 1. 편집자(승인된 이메일) 목록
--    이 표에 있는 이메일로 로그인한 사람만 수정할 수 있습니다.
-- ─────────────────────────────────────────────
create table if not exists public.editors (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email)),
  role        text not null default 'editor' check (role in ('admin', 'editor')),
  note        text default '',
  created_at  timestamptz not null default now()
);

-- ★★★ [관리자 이메일] 여기를 내 이메일로 바꾸세요 (소문자로) ★★★
insert into public.editors (email, role, note)
values ('여기에-내-이메일@gmail.com', 'admin', '홈페이지 주인')
on conflict (email) do update set role = 'admin';


-- ─────────────────────────────────────────────
-- 2. 권한 확인 함수 (서버에서 실행됨)
--    로그인 토큰 안의 이메일이 editors 표에 있는지 확인합니다.
-- ─────────────────────────────────────────────
create or replace function public.current_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors e where e.email = public.current_email() and public.current_email() <> '')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors e where e.email = public.current_email() and e.role = 'admin' and public.current_email() <> '')
$$;

-- 화면에서 "내 권한"을 물어볼 때 쓰는 함수 → 'admin' / 'editor' / 'viewer'
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select e.role from public.editors e where e.email = public.current_email() and public.current_email() <> ''), 'viewer')
$$;

grant execute on function public.is_editor(), public.is_admin(), public.my_role(), public.current_email() to anon, authenticated;


-- ─────────────────────────────────────────────
-- 3. 콘텐츠 표들
-- ─────────────────────────────────────────────

-- 사이트 전체 설정 (제목, 색상, 글꼴, 메인 화면 구성 등) — 한 줄만 존재
create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 메뉴 = 페이지 목록
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  type        text not null default 'custom' check (type in ('home', 'papers', 'series', 'gallery', 'log', 'custom')),
  description text default '',
  cover       text default '',
  visible     boolean not null default true,
  sort_order  int not null default 0,
  content     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 기록철(등장인물) 페이지의 종이들
create table if not exists public.papers (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  title       text default '',
  background  text default '',
  aspect      numeric not null default 0.75,
  elements    jsonb not null default '[]'::jsonb,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 시리즈(DVD)
create table if not exists public.series (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  title       text not null default '',
  subtitle    text default '',
  year        text default '',
  summary     text default '',
  cover       text default '',
  spine_color text default '#2a2622',
  label_color text default '#e4dab9',
  blocks      jsonb not null default '[]'::jsonb,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 로그(블로그) 글
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  title       text not null default '',
  date        date not null default current_date,
  cover       text default '',
  excerpt     text default '',
  blocks      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 갤러리 분류 / 이미지
create table if not exists public.gallery_categories (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create table if not exists public.gallery_images (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.gallery_categories(id) on delete cascade,
  url         text not null,
  caption     text default '',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 올린 파일 기록 (이미지 보관함)
create table if not exists public.media (
  id          uuid primary key default gen_random_uuid(),
  path        text default '',
  url         text not null,
  name        text default '',
  size        bigint default 0,
  mime        text default '',
  folder      text default '',
  created_at  timestamptz not null default now()
);

create index if not exists papers_page_idx on public.papers(page_id);
create index if not exists series_page_idx on public.series(page_id);
create index if not exists posts_page_idx on public.posts(page_id);
create index if not exists cats_page_idx on public.gallery_categories(page_id);
create index if not exists imgs_cat_idx on public.gallery_images(category_id);
create index if not exists media_url_idx on public.media(url);


-- ─────────────────────────────────────────────
-- 4. 보안 규칙 (Row Level Security)
--    · 누구나(로그인 안 해도) 읽기 가능
--    · 쓰기/수정/삭제는 editors 표에 있는 이메일만
--    · editors 표 자체는 관리자(admin)만 수정
-- ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_settings','pages','papers','series','posts','gallery_categories','gallery_images','media'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('drop policy if exists "editors delete" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.is_editor())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.is_editor())', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.editors enable row level security;
drop policy if exists "editors read" on public.editors;
drop policy if exists "admin insert" on public.editors;
drop policy if exists "admin update" on public.editors;
drop policy if exists "admin delete" on public.editors;
-- 편집자 목록은 편집자만 볼 수 있음 (방문자에게 이메일 노출 X)
create policy "editors read"  on public.editors for select to authenticated using (public.is_editor());
create policy "admin insert"  on public.editors for insert to authenticated with check (public.is_admin());
create policy "admin update"  on public.editors for update to authenticated using (public.is_admin() and email <> public.current_email()) with check (public.is_admin());
-- 관리자가 실수로 자기 자신을 지우지 못하게 막음
create policy "admin delete"  on public.editors for delete to authenticated using (public.is_admin() and email <> public.current_email());
revoke all on public.editors from anon;
grant select, insert, update, delete on public.editors to authenticated;


-- ─────────────────────────────────────────────
-- 5. 이미지 저장소 (Storage) — 'media' 라는 공개 보관함
--    · 누구나 이미지 보기 가능 (홈페이지에 보여야 하므로)
--    · 올리기/바꾸기/지우기는 편집자만
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true;

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media editors insert" on storage.objects;
drop policy if exists "media editors update" on storage.objects;
drop policy if exists "media editors delete" on storage.objects;
create policy "media public read"    on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy "media editors insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_editor());
create policy "media editors update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_editor());
create policy "media editors delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_editor());

-- 완료! 아래에 "Success. No rows returned" 가 보이면 성공입니다.
