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
