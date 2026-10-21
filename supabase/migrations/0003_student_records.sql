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
