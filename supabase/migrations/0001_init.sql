-- ConvoMastery database schema.
-- Run this once in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists pgcrypto;

-- Profiles: one row per account, created automatically on sign-up.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  user_type text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default ''
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  level text not null check (level in ('A2', 'B1', 'B2', 'C1')),
  age_group text not null check (age_group in ('Teens', 'Adults', 'Young learners')),
  category_id uuid references public.categories (id) on delete set null,
  topics text[] not null default '{}',
  activity_types text[] not null default '{}',
  sample_questions text[] not null default '{}',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  slide_count integer not null default 0,
  duration_minutes integer not null default 60,
  cover_color text not null default '#0E7C7B',
  cover_image_url text,
  preview_images text[] not null default '{}',
  file_path text,
  file_name text,
  published boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'USD',
  provider text not null,              -- 'free', 'stripe', ...
  provider_ref text unique,            -- payment session id, prevents double recording
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  kind text not null,
  user_type text,
  message text not null check (char_length(message) between 1 and 5000),
  handled boolean not null default false,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index lessons_published_idx on public.lessons (published, created_at desc);
create index purchases_user_idx on public.purchases (user_id);

-- Keep updated_at current
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger lessons_touch before update on public.lessons for each row execute function public.touch_updated_at();

-- Create a profile when someone signs up
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, user_type)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'user_type');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Stop customers from promoting themselves to admin
create function public.protect_role() returns trigger language plpgsql as $$
begin
  -- auth.uid() is empty in the Supabase SQL editor, where the owner sets the first admin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_role();

-- Free lessons: add to the signed-in user's library without payment
create function public.claim_free_lesson(p_lesson_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  if not exists (select 1 from lessons where id = p_lesson_id and published and price_cents = 0) then
    raise exception 'This lesson is not free.';
  end if;
  insert into purchases (user_id, lesson_id, amount_cents, currency, provider)
  values (auth.uid(), p_lesson_id, 0, 'USD', 'free')
  on conflict (user_id, lesson_id) do nothing;
end $$;

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.lessons enable row level security;
alter table public.purchases enable row level security;
alter table public.inquiries enable row level security;

create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "categories public read" on public.categories for select using (true);
create policy "categories admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "lessons public read" on public.lessons for select using (
  published
  or public.is_admin()
  or exists (select 1 from public.purchases p where p.lesson_id = lessons.id and p.user_id = auth.uid())
);
create policy "lessons admin write" on public.lessons for all using (public.is_admin()) with check (public.is_admin());

-- Purchases are only created by claim_free_lesson() or the payment webhook (service role).
create policy "own purchases read" on public.purchases for select using (user_id = auth.uid() or public.is_admin());

create policy "anyone can send a message" on public.inquiries for insert with check (handled = false and notified = false);
create policy "admin reads messages" on public.inquiries for select using (public.is_admin());
create policy "admin updates messages" on public.inquiries for update using (public.is_admin());

-- ---------- File storage ----------
insert into storage.buckets (id, name, public) values ('lesson-files', 'lesson-files', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('public-images', 'public-images', true) on conflict do nothing;

-- Buyers can download the file of a lesson they own; admins can do everything.
create policy "buyers download lesson files" on storage.objects for select using (
  bucket_id = 'lesson-files' and (
    public.is_admin()
    or exists (
      select 1 from public.lessons l join public.purchases p on p.lesson_id = l.id
      where l.file_path = storage.objects.name and p.user_id = auth.uid()
    )
  )
);
create policy "admin manages lesson files" on storage.objects for all
  using (bucket_id = 'lesson-files' and public.is_admin())
  with check (bucket_id = 'lesson-files' and public.is_admin());

create policy "public images read" on storage.objects for select using (bucket_id = 'public-images');
create policy "admin manages images" on storage.objects for all
  using (bucket_id = 'public-images' and public.is_admin())
  with check (bucket_id = 'public-images' and public.is_admin());
