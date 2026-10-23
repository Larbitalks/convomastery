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
