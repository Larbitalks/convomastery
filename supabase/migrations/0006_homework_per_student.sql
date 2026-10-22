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
