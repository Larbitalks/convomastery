-- ConvoMastery: complete database setup for a NEW Supabase project. Paste this whole file into the Supabase SQL Editor and click Run, once.


-- ===== migrations/0001_init.sql =====
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

-- ===== migrations/0002_teaching_booking_messaging.sql =====
-- Teaching tools (classes, students, awards, homework), teaching from the website,
-- booking and messaging. Run after 0001_init.sql.

-- ---------- Teaching from the website ----------
alter table public.lessons add column slide_images text[] not null default '{}';

insert into storage.buckets (id, name, public) values ('lesson-slides', 'lesson-slides', false) on conflict do nothing;

create policy "owners view lesson slides" on storage.objects for select using (
  bucket_id = 'lesson-slides' and (
    public.is_admin()
    or exists (
      select 1 from public.lessons l join public.purchases p on p.lesson_id = l.id
      where storage.objects.name = any (l.slide_images) and p.user_id = auth.uid()
    )
  )
);
create policy "admin manages lesson slides" on storage.objects for all
  using (bucket_id = 'lesson-slides' and public.is_admin())
  with check (bucket_id = 'lesson-slides' and public.is_admin());

-- ---------- Classes, students and awards (private to each teacher) ----------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  level text not null default 'B1',
  color text not null default '#0E7C7B',
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.award_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  points integer not null default 1 check (points between 1 and 10),
  color text not null default '#0E7C7B',
  position integer not null default 0
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  category_id uuid not null references public.award_categories (id) on delete cascade,
  points integer not null,
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  instructions text not null default '',
  due_date date not null,
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.homework_status (
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'done', 'late', 'missing')),
  feedback text not null default '',
  updated_at timestamptz not null default now(),
  primary key (homework_id, student_id)
);

create index students_class_idx on public.students (class_id);
create index awards_class_idx on public.awards (class_id, created_at);
create index homework_class_idx on public.homework (class_id);

-- Every new class starts with the default award categories
create function public.add_default_award_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into award_categories (owner_id, class_id, name, points, color, position) values
    (new.owner_id, new.id, 'Participation', 1, '#0E7C7B', 0),
    (new.owner_id, new.id, 'Great answer', 2, '#3D4FA8', 1),
    (new.owner_id, new.id, 'New vocabulary', 1, '#7A4FB5', 2),
    (new.owner_id, new.id, 'Teamwork', 1, '#B5651D', 3),
    (new.owner_id, new.id, 'Homework', 2, '#B91C1C', 4);
  return new;
end $$;
create trigger classes_default_awards after insert on public.classes for each row execute function public.add_default_award_categories();

-- Give an award: points come from the category, and everything must belong to the same teacher and class
create function public.give_award(p_class_id uuid, p_student_id uuid, p_category_id uuid, p_lesson_id uuid default null)
returns public.awards language plpgsql security definer set search_path = public as $$
declare
  v_points integer;
  v_award public.awards;
begin
  select points into v_points from award_categories
    where id = p_category_id and class_id = p_class_id and owner_id = auth.uid();
  if v_points is null then raise exception 'That award no longer exists.'; end if;
  if not exists (select 1 from students where id = p_student_id and class_id = p_class_id and owner_id = auth.uid()) then
    raise exception 'That student is not in this class.';
  end if;
  insert into awards (owner_id, class_id, student_id, category_id, points, lesson_id)
    values (auth.uid(), p_class_id, p_student_id, p_category_id, v_points, p_lesson_id)
    returning * into v_award;
  return v_award;
end $$;

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.award_categories enable row level security;
alter table public.awards enable row level security;
alter table public.homework enable row level security;
alter table public.homework_status enable row level security;

create policy "own classes" on public.classes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own students" on public.students for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()));
create policy "own award categories" on public.award_categories for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()));
-- Awards are created through give_award(); teachers can read and undo their own.
create policy "own awards read" on public.awards for select using (owner_id = auth.uid());
create policy "own awards delete" on public.awards for delete using (owner_id = auth.uid());
create policy "own homework" on public.homework for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()));
create policy "own homework status" on public.homework_status for all using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.homework h where h.id = homework_id and h.owner_id = auth.uid())
    and exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid())
  );

-- ---------- Booking ----------
create table public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 10 and 480),
  kind text not null check (kind in ('One-to-one lesson', 'Trial lesson', 'Teacher training')),
  capacity integer not null default 1 check (capacity between 1 and 100),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.booking_slots (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);
create unique index bookings_one_per_user on public.bookings (slot_id, user_id) where status = 'confirmed';
create index booking_slots_start_idx on public.booking_slots (starts_at);

-- Open times with the number of places taken (customers cannot see each other's bookings)
create function public.list_slots(p_include_past boolean default false)
returns table (id uuid, starts_at timestamptz, duration_minutes integer, kind text, capacity integer, notes text, booked_count integer)
language sql stable security definer set search_path = public as $$
  select s.id, s.starts_at, s.duration_minutes, s.kind, s.capacity, s.notes,
    (select count(*)::int from bookings b where b.slot_id = s.id and b.status = 'confirmed')
  from booking_slots s
  where (p_include_past and (public.is_admin() or exists (select 1 from bookings b where b.slot_id = s.id and b.user_id = auth.uid())))
     or s.starts_at > now()
  order by s.starts_at
$$;

create function public.book_slot(p_slot_id uuid, p_message text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_slot booking_slots;
  v_taken integer;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  select * into v_slot from booking_slots where id = p_slot_id for update;
  if v_slot.id is null then raise exception 'This time is no longer available.'; end if;
  if v_slot.starts_at <= now() then raise exception 'This time has already passed.'; end if;
  if exists (select 1 from bookings where slot_id = p_slot_id and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'You have already booked this time.';
  end if;
  select count(*) into v_taken from bookings where slot_id = p_slot_id and status = 'confirmed';
  if v_taken >= v_slot.capacity then raise exception 'This time was just taken. Choose another one.'; end if;
  insert into bookings (slot_id, user_id, message) values (p_slot_id, auth.uid(), coalesce(p_message, '')) returning id into v_id;
  return v_id;
end $$;

create function public.cancel_booking(p_booking_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'cancelled'
    where id = p_booking_id and status = 'confirmed' and (user_id = auth.uid() or public.is_admin());
  if not found then raise exception 'That booking no longer exists.'; end if;
end $$;

alter table public.booking_slots enable row level security;
alter table public.bookings enable row level security;
create policy "slots admin manage" on public.booking_slots for all using (public.is_admin()) with check (public.is_admin());
create policy "slots readable by bookers" on public.booking_slots for select using (
  starts_at > now() or exists (select 1 from public.bookings b where b.slot_id = booking_slots.id and b.user_id = auth.uid())
);
create policy "own bookings read" on public.bookings for select using (user_id = auth.uid() or public.is_admin());

-- ---------- Messages between customers and the site owner ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_user_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  from_admin boolean not null default false,
  body text not null check (char_length(body) between 1 and 5000),
  read boolean not null default false,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_user_id, created_at);

alter table public.messages enable row level security;
create policy "read own thread" on public.messages for select using (thread_user_id = auth.uid() or public.is_admin());
create policy "customers write to their thread" on public.messages for insert with check (
  thread_user_id = auth.uid() and sender_id = auth.uid() and from_admin = false and read = false and notified = false
);
create policy "admin replies" on public.messages for insert with check (
  public.is_admin() and sender_id = auth.uid() and from_admin = true and read = false and notified = false
);

create function public.mark_thread_read(p_thread_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and p_thread_user_id <> auth.uid() then
    update messages set read = true where thread_user_id = p_thread_user_id and from_admin = false and not read;
  elsif p_thread_user_id = auth.uid() then
    update messages set read = true where thread_user_id = auth.uid() and from_admin = true and not read;
  end if;
end $$;

create function public.unread_message_count() returns integer
language sql stable security definer set search_path = public as $$
  select case when public.is_admin()
    then (select count(*)::int from messages where from_admin = false and not read)
    else (select count(*)::int from messages where thread_user_id = auth.uid() and from_admin = true and not read)
  end
$$;

-- Bookings and emails sent by server functions need to know if a booking email went out
alter table public.bookings add column notified_status text;

-- ===== migrations/0003_student_records.sql =====
-- Student records: extra details and a dated notes log. Run after 0002.
alter table public.students
  add column level text not null default '',
  add column contact text not null default '',
  add column goals text not null default '';

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  date date not null default current_date,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index student_notes_student_idx on public.student_notes (student_id, date desc);

alter table public.student_notes enable row level security;
create policy "own student notes" on public.student_notes for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid()));

-- ===== migrations/0004_palette_colours.sql =====
-- Optional: new default award colours to match the site's palette. Safe to run any time.
create or replace function public.add_default_award_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into award_categories (owner_id, class_id, name, points, color, position) values
    (new.owner_id, new.id, 'Participation', 1, '#46725D', 0),
    (new.owner_id, new.id, 'Great answer', 2, '#5B6C8F', 1),
    (new.owner_id, new.id, 'New vocabulary', 1, '#7A5C8C', 2),
    (new.owner_id, new.id, 'Teamwork', 1, '#9A6A1F', 3),
    (new.owner_id, new.id, 'Homework', 2, '#3D405B', 4);
  return new;
end $$;
alter table public.lessons alter column cover_color set default '#3D405B';

-- ===== migrations/0005_student_progress_codes.sql =====
-- Student progress codes: a teacher can share a read-only progress page with a student or parent.
-- Run after 0003_student_records.sql.

alter table public.students add column share_code text unique;
alter table public.student_notes add column shared boolean not null default false;

-- Read-only progress for one student, found by their code. Works without signing in.
-- Returns only what a student should see: no private notes, no contact details, no other students.
create or replace function public.student_progress(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;

  return jsonb_build_object(
    'name', s.name,
    'className', (select name from classes where id = s.class_id),
    'level', coalesce(nullif(s.level, ''), (select level from classes where id = s.class_id)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    'recentAwards', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', a.created_at, 'category', c.name, 'color', c.color, 'points', a.points, 'lesson', l.title) x
        from awards a join award_categories c on c.id = a.category_id left join lessons l on l.id = a.lesson_id
        where a.student_id = s.id order by a.created_at desc limit 10) t), '[]'::jsonb),
    'homework', coalesce((
      select jsonb_agg(jsonb_build_object('title', h.title, 'instructions', h.instructions, 'dueDate', h.due_date,
        'status', coalesce(hs.status, 'assigned'), 'feedback', coalesce(hs.feedback, '')) order by h.due_date desc)
      from homework h left join homework_status hs on hs.homework_id = h.id and hs.student_id = s.id
      where h.class_id = s.class_id), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('date', n.date, 'body', n.body) order by n.date desc, n.created_at desc)
      from student_notes n where n.student_id = s.id and n.shared), '[]'::jsonb)
  );
end $$;

grant execute on function public.student_progress(text) to anon, authenticated;

-- ===== migrations/0006_homework_per_student.sql =====
-- Homework belongs to one student (set from the student's profile).
-- Existing whole-class homework is copied to every student in that class, with their status and feedback.
-- Run after 0005_student_progress_codes.sql.

alter table public.homework add column student_id uuid references public.students (id) on delete cascade;
create index homework_student_idx on public.homework (student_id);

do $$
declare
  h record;
  st record;
  new_id uuid;
begin
  for h in select * from public.homework where student_id is null loop
    for st in select id from public.students where class_id = h.class_id loop
      insert into public.homework (owner_id, class_id, student_id, title, instructions, due_date, lesson_id, created_at)
        values (h.owner_id, h.class_id, st.id, h.title, h.instructions, h.due_date, h.lesson_id, h.created_at)
        returning id into new_id;
      insert into public.homework_status (homework_id, student_id, owner_id, status, feedback, updated_at)
        select new_id, hs.student_id, hs.owner_id, hs.status, hs.feedback, hs.updated_at
        from public.homework_status hs where hs.homework_id = h.id and hs.student_id = st.id;
    end loop;
    delete from public.homework where id = h.id;
  end loop;
end $$;

-- New homework must name a student of the teacher's own class
drop policy if exists "own homework" on public.homework;
create policy "own homework" on public.homework for all using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid())
    and (student_id is null or exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid() and s.class_id = homework.class_id))
  );

-- Progress pages show only the student's own homework
create or replace function public.student_progress(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;

  return jsonb_build_object(
    'name', s.name,
    'className', (select name from classes where id = s.class_id),
    'level', coalesce(nullif(s.level, ''), (select level from classes where id = s.class_id)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    'recentAwards', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', a.created_at, 'category', c.name, 'color', c.color, 'points', a.points, 'lesson', l.title) x
        from awards a join award_categories c on c.id = a.category_id left join lessons l on l.id = a.lesson_id
        where a.student_id = s.id order by a.created_at desc limit 10) t), '[]'::jsonb),
    'homework', coalesce((
      select jsonb_agg(jsonb_build_object('title', h.title, 'instructions', h.instructions, 'dueDate', h.due_date,
        'status', coalesce(hs.status, 'assigned'), 'feedback', coalesce(hs.feedback, '')) order by h.due_date desc)
      from homework h left join homework_status hs on hs.homework_id = h.id and hs.student_id = s.id
      where h.student_id = s.id), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('date', n.date, 'body', n.body) order by n.date desc, n.created_at desc)
      from student_notes n where n.student_id = s.id and n.shared), '[]'::jsonb)
  );
end $$;

-- ===== migrations/0007_class_sessions.sql =====
-- Class sessions: start a class from a student's profile, record attendance, behaviour,
-- notes and the lesson taught. Run after 0006_homework_per_student.sql.

-- Each teacher's own behaviour buttons (null = the default set)
alter table public.profiles add column behaviour_options jsonb;
-- Whether the student's progress page shows behaviour (off by default)
alter table public.students add column show_behaviour boolean not null default false;

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  attendance text not null default 'present' check (attendance in ('present', 'late', 'absent')),
  lesson_id uuid references public.lessons (id) on delete set null,
  behaviour jsonb not null default '[]'::jsonb,   -- [{ "label": "Active", "color": "#46725D", "at": "..." }]
  covered text not null default '',
  new_words text not null default '',
  corrections text not null default '',
  notes text not null default '',
  note_id uuid references public.student_notes (id) on delete set null,
  created_at timestamptz not null default now()
);
create index class_sessions_student_idx on public.class_sessions (student_id, date desc);

alter table public.class_sessions enable row level security;
create policy "own class sessions" on public.class_sessions for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid()));

-- Progress page: add recent classes (attendance and behaviour) when the teacher has switched it on
create or replace function public.student_progress(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;

  return jsonb_build_object(
    'name', s.name,
    'className', (select name from classes where id = s.class_id),
    'level', coalesce(nullif(s.level, ''), (select level from classes where id = s.class_id)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    'recentAwards', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', a.created_at, 'category', c.name, 'color', c.color, 'points', a.points, 'lesson', l.title) x
        from awards a join award_categories c on c.id = a.category_id left join lessons l on l.id = a.lesson_id
        where a.student_id = s.id order by a.created_at desc limit 10) t), '[]'::jsonb),
    'homework', coalesce((
      select jsonb_agg(jsonb_build_object('title', h.title, 'instructions', h.instructions, 'dueDate', h.due_date,
        'status', coalesce(hs.status, 'assigned'), 'feedback', coalesce(hs.feedback, '')) order by h.due_date desc)
      from homework h left join homework_status hs on hs.homework_id = h.id and hs.student_id = s.id
      where h.student_id = s.id), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('date', n.date, 'body', n.body) order by n.date desc, n.created_at desc)
      from student_notes n where n.student_id = s.id and n.shared), '[]'::jsonb),
    'classes', case when s.show_behaviour then coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.date desc) from (
        select cs.date, cs.attendance,
          coalesce((select jsonb_agg(jsonb_build_object('label', b.label, 'color', b.color, 'count', b.n) order by b.n desc)
            from (select e->>'label' as label, max(e->>'color') as color, count(*) as n
                  from jsonb_array_elements(cs.behaviour) e group by e->>'label') b), '[]'::jsonb) as behaviour
        from class_sessions cs where cs.student_id = s.id and cs.ended_at is not null
        order by cs.date desc, cs.started_at desc limit 8) t), '[]'::jsonb) else null end
  );
end $$;

-- ===== migrations/0008_review_and_performance.sql =====
-- Review check and overall performance. Run after 0007_class_sessions.sql.
-- Safe to run more than once.

-- Did the student review the previous lesson? yes, partly or no (empty = not checked)
alter table public.class_sessions add column if not exists review text;
alter table public.class_sessions drop constraint if exists class_sessions_review_check;
alter table public.class_sessions add constraint class_sessions_review_check check (review in ('yes', 'partly', 'no'));

-- Positive / neutral / negative type of one behaviour click: saved on the click,
-- else the teacher's button with that name, else the default buttons, else neutral
create or replace function public.behaviour_type(p_mark jsonb, p_options jsonb)
returns text language sql immutable set search_path = public as $$
  select coalesce(
    p_mark->>'type',
    (select o->>'type' from jsonb_array_elements(case when jsonb_typeof(p_options) = 'array' then p_options else '[]'::jsonb end) o
      where o->>'label' = p_mark->>'label' limit 1),
    case when p_mark->>'label' in ('Active', 'Participating well') then 'positive'
         when p_mark->>'label' in ('Distracted', 'Not paying attention', 'Off-task / phone') then 'negative' end,
    'neutral')
$$;

-- Progress page: classes now also carry review, award points and behaviour counts by type,
-- and up to 16 are sent (8 shown, 8 more for the trend). Still only when show_behaviour is on.
create or replace function public.student_progress(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
  v_options jsonb;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;
  select behaviour_options into v_options from profiles where id = s.owner_id;

  return jsonb_build_object(
    'name', s.name,
    'className', (select name from classes where id = s.class_id),
    'level', coalesce(nullif(s.level, ''), (select level from classes where id = s.class_id)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    'recentAwards', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', a.created_at, 'category', c.name, 'color', c.color, 'points', a.points, 'lesson', l.title) x
        from awards a join award_categories c on c.id = a.category_id left join lessons l on l.id = a.lesson_id
        where a.student_id = s.id order by a.created_at desc limit 10) t), '[]'::jsonb),
    'homework', coalesce((
      select jsonb_agg(jsonb_build_object('title', h.title, 'instructions', h.instructions, 'dueDate', h.due_date,
        'status', coalesce(hs.status, 'assigned'), 'feedback', coalesce(hs.feedback, '')) order by h.due_date desc)
      from homework h left join homework_status hs on hs.homework_id = h.id and hs.student_id = s.id
      where h.student_id = s.id), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('date', n.date, 'body', n.body) order by n.date desc, n.created_at desc)
      from student_notes n where n.student_id = s.id and n.shared), '[]'::jsonb),
    'classes', case when s.show_behaviour then coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.date desc, t.started_at desc) from (
        select cs.date, cs.started_at, cs.attendance, cs.review,
          coalesce((select jsonb_agg(jsonb_build_object('label', b.label, 'color', b.color, 'count', b.n) order by b.n desc)
            from (select e->>'label' as label, max(e->>'color') as color, count(*) as n
                  from jsonb_array_elements(cs.behaviour) e group by e->>'label') b), '[]'::jsonb) as behaviour,
          (select count(*) from jsonb_array_elements(cs.behaviour) e where behaviour_type(e, v_options) = 'positive') as positive,
          (select count(*) from jsonb_array_elements(cs.behaviour) e where behaviour_type(e, v_options) = 'negative') as negative,
          coalesce((select sum(a.points) from awards a where a.student_id = s.id
            and a.created_at between cs.started_at and cs.ended_at), 0) as points
        from class_sessions cs where cs.student_id = s.id and cs.ended_at is not null
        order by cs.date desc, cs.started_at desc limit 16) t), '[]'::jsonb) else null end
  );
end $$;

grant execute on function public.student_progress(text) to anon, authenticated;

-- ===== migrations/0009_class_pictures.sql =====
-- Optional picture for each class (a small image stored with the class). Run after 0008. Safe to run more than once.
alter table public.classes add column if not exists image text;
alter table public.classes drop constraint if exists classes_image_size;
alter table public.classes add constraint classes_image_size check (image is null or (image like 'data:image/%' and length(image) < 400000));

-- ===== migrations/0010_exams.sql =====
-- Exam records: unit exams (quizzes), mid-term and final exams for each student. Run after 0009. Safe to run more than once.

-- Each teacher's usual "out of" for each exam type
alter table public.profiles add column if not exists exam_totals jsonb;

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  type text not null check (type in ('unit', 'midterm', 'final')),
  title text not null default '' check (char_length(title) <= 200),
  date date not null default current_date,
  score numeric not null check (score >= 0),
  out_of numeric not null check (out_of > 0),
  feedback text not null default '' check (char_length(feedback) <= 3000),
  created_at timestamptz not null default now(),
  constraint exams_score_within check (score <= out_of)
);
create index if not exists exams_student_idx on public.exams (student_id, date desc);

alter table public.exams enable row level security;
drop policy if exists "own exams" on public.exams;
create policy "own exams" on public.exams for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid()));

-- Progress page: students and parents always see their exam results
create or replace function public.student_progress(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
  v_options jsonb;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;
  select behaviour_options into v_options from profiles where id = s.owner_id;

  return jsonb_build_object(
    'name', s.name,
    'className', (select name from classes where id = s.class_id),
    'level', coalesce(nullif(s.level, ''), (select level from classes where id = s.class_id)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    'recentAwards', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', a.created_at, 'category', c.name, 'color', c.color, 'points', a.points, 'lesson', l.title) x
        from awards a join award_categories c on c.id = a.category_id left join lessons l on l.id = a.lesson_id
        where a.student_id = s.id order by a.created_at desc limit 10) t), '[]'::jsonb),
    'homework', coalesce((
      select jsonb_agg(jsonb_build_object('title', h.title, 'instructions', h.instructions, 'dueDate', h.due_date,
        'status', coalesce(hs.status, 'assigned'), 'feedback', coalesce(hs.feedback, '')) order by h.due_date desc)
      from homework h left join homework_status hs on hs.homework_id = h.id and hs.student_id = s.id
      where h.student_id = s.id), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('date', n.date, 'body', n.body) order by n.date desc, n.created_at desc)
      from student_notes n where n.student_id = s.id and n.shared), '[]'::jsonb),
    'exams', coalesce((
      select jsonb_agg(jsonb_build_object('type', e.type, 'title', e.title, 'date', e.date, 'score', e.score,
        'outOf', e.out_of, 'feedback', e.feedback) order by e.date desc, e.created_at desc)
      from exams e where e.student_id = s.id), '[]'::jsonb),
    'classes', case when s.show_behaviour then coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.date desc, t.started_at desc) from (
        select cs.date, cs.started_at, cs.attendance, cs.review,
          coalesce((select jsonb_agg(jsonb_build_object('label', b.label, 'color', b.color, 'count', b.n) order by b.n desc)
            from (select e->>'label' as label, max(e->>'color') as color, count(*) as n
                  from jsonb_array_elements(cs.behaviour) e group by e->>'label') b), '[]'::jsonb) as behaviour,
          (select count(*) from jsonb_array_elements(cs.behaviour) e where behaviour_type(e, v_options) = 'positive') as positive,
          (select count(*) from jsonb_array_elements(cs.behaviour) e where behaviour_type(e, v_options) = 'negative') as negative,
          coalesce((select sum(a.points) from awards a where a.student_id = s.id
            and a.created_at between cs.started_at and cs.ended_at), 0) as points
        from class_sessions cs where cs.student_id = s.id and cs.ended_at is not null
        order by cs.date desc, cs.started_at desc limit 16) t), '[]'::jsonb) else null end
  );
end $$;

grant execute on function public.student_progress(text) to anon, authenticated;

-- ===== migrations/0011_student_messages.sql =====
-- Students and parents can message their teacher from the progress page, and the teacher replies on the student's profile.
-- The progress page also gets what it needs to look like the teacher's view of the profile (read-only).
-- Run after 0010_exams.sql. Safe to run more than once.

create table if not exists public.student_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  from_teacher boolean not null default false,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  read boolean not null default false,       -- for the teacher: has the teacher seen this student message
  notified boolean not null default false,   -- email sent
  created_at timestamptz not null default now()
);
create index if not exists student_messages_student_idx on public.student_messages (student_id, created_at);
create index if not exists student_messages_unread_idx on public.student_messages (owner_id) where not from_teacher and not read;

alter table public.student_messages enable row level security;
-- The teacher reads, replies to, marks read and deletes messages for their own students.
-- Students never touch the table directly: they use send_student_message() with their code.
drop policy if exists "teacher reads own student messages" on public.student_messages;
create policy "teacher reads own student messages" on public.student_messages for select using (owner_id = auth.uid());
drop policy if exists "teacher replies" on public.student_messages;
create policy "teacher replies" on public.student_messages for insert
  with check (owner_id = auth.uid() and from_teacher and not notified
    and exists (select 1 from public.students s where s.id = student_id and s.owner_id = auth.uid()));
drop policy if exists "teacher marks read" on public.student_messages;
create policy "teacher marks read" on public.student_messages for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "teacher deletes" on public.student_messages;
create policy "teacher deletes" on public.student_messages for delete using (owner_id = auth.uid());
-- Only the read flag may change
revoke update on public.student_messages from authenticated;
grant update (read) on public.student_messages to authenticated;

-- A student (or parent) sends a message with their progress code. At most 10 a day per student.
create or replace function public.send_student_message(p_code text, p_body text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_body text := btrim(coalesce(p_body, ''));
  s students;
  v_id uuid;
begin
  if length(v_code) < 10 then raise exception 'This code does not work.'; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then raise exception 'This code does not work.'; end if;
  if char_length(v_body) = 0 then raise exception 'Write a message first.'; end if;
  if char_length(v_body) > 2000 then raise exception 'Please keep your message under 2000 characters.'; end if;
  if (select count(*) from student_messages where student_id = s.id and not from_teacher and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent 10 messages today. Please wait until tomorrow, or talk to your teacher in class.';
  end if;
  insert into student_messages (owner_id, student_id, from_teacher, body) values (s.owner_id, s.id, false, v_body) returning id into v_id;
  return v_id;
end $$;
grant execute on function public.send_student_message(text, text) to anon, authenticated;

create or replace function public.student_progress(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
  v_options jsonb;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;
  select behaviour_options into v_options from profiles where id = s.owner_id;

  return jsonb_build_object(
    'name', s.name,
    'goals', coalesce(s.goals, ''),
    'teacherName', (select coalesce(nullif(full_name, ''), 'your teacher') from profiles where id = s.owner_id),
    'classesTaken', (select count(*) from class_sessions where student_id = s.id and ended_at is not null),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('fromTeacher', m.from_teacher, 'body', m.body, 'createdAt', m.created_at) order by m.created_at)
      from (select * from student_messages where student_id = s.id order by created_at desc limit 100) m), '[]'::jsonb),
    'className', (select name from classes where id = s.class_id),
    'level', coalesce(nullif(s.level, ''), (select level from classes where id = s.class_id)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0),
        'count', (select count(*) from awards a where a.student_id = s.id and a.category_id = c.id))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    'recentAwards', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', a.created_at, 'category', c.name, 'color', c.color, 'points', a.points, 'lesson', l.title) x
        from awards a join award_categories c on c.id = a.category_id left join lessons l on l.id = a.lesson_id
        where a.student_id = s.id order by a.created_at desc limit 10) t), '[]'::jsonb),
    'homework', coalesce((
      select jsonb_agg(jsonb_build_object('title', h.title, 'instructions', h.instructions, 'dueDate', h.due_date,
        'status', coalesce(hs.status, 'assigned'), 'feedback', coalesce(hs.feedback, '')) order by h.due_date desc)
      from homework h left join homework_status hs on hs.homework_id = h.id and hs.student_id = s.id
      where h.student_id = s.id), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('date', n.date, 'body', n.body) order by n.date desc, n.created_at desc)
      from student_notes n where n.student_id = s.id and n.shared), '[]'::jsonb),
    'exams', coalesce((
      select jsonb_agg(jsonb_build_object('type', e.type, 'title', e.title, 'date', e.date, 'score', e.score,
        'outOf', e.out_of, 'feedback', e.feedback) order by e.date desc, e.created_at desc)
      from exams e where e.student_id = s.id), '[]'::jsonb),
    'classes', case when s.show_behaviour then coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.date desc, t.started_at desc) from (
        select cs.date, cs.started_at, cs.attendance, cs.review,
          (select title from lessons where id = cs.lesson_id) as lesson,
          round(extract(epoch from (cs.ended_at - cs.started_at)) / 60) as minutes,
          coalesce((select jsonb_agg(jsonb_build_object('label', b.label, 'color', b.color, 'count', b.n) order by b.n desc)
            from (select e->>'label' as label, max(e->>'color') as color, count(*) as n
                  from jsonb_array_elements(cs.behaviour) e group by e->>'label') b), '[]'::jsonb) as behaviour,
          (select count(*) from jsonb_array_elements(cs.behaviour) e where behaviour_type(e, v_options) = 'positive') as positive,
          (select count(*) from jsonb_array_elements(cs.behaviour) e where behaviour_type(e, v_options) = 'negative') as negative,
          coalesce((select sum(a.points) from awards a where a.student_id = s.id
            and a.created_at between cs.started_at and cs.ended_at), 0) as points
        from class_sessions cs where cs.student_id = s.id and cs.ended_at is not null
        order by cs.date desc, cs.started_at desc limit 16) t), '[]'::jsonb) else null end
  );
end $$;

grant execute on function public.student_progress(text) to anon, authenticated;

-- ===== seed.sql =====
-- Optional starter topic areas. Run after 0001_init.sql.
insert into public.categories (name, slug, description) values
  ('Everyday life', 'everyday-life', 'Family, sleep, habits and the routines everyone can talk about.'),
  ('Society and money', 'society-and-money', 'Work, money, fairness and the choices people make.'),
  ('Science and tech', 'science-and-tech', 'Screens, AI, health and the future.'),
  ('Culture and travel', 'culture-and-travel', 'Food, places, traditions and luck.')
on conflict (slug) do nothing;
