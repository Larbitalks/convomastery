-- Discoveries by camp: students collect from the camp of their class (Explorers, Trekkers, Climbers, Mountaineers,
-- Alpinists), and move up when the teacher changes their class. This keeps a dated record of class moves so earlier
-- finds stay with the camp they were found in. Run after 0012. Safe to run more than once.

create table if not exists public.student_class_moves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  class_name text not null default '',   -- kept as it was at the time, even if the class is renamed or deleted later
  class_level text not null default '',
  moved_at timestamptz not null default now()
);
create index if not exists student_class_moves_student_idx on public.student_class_moves (student_id, moved_at);

alter table public.student_class_moves enable row level security;
drop policy if exists "teacher reads own class moves" on public.student_class_moves;
create policy "teacher reads own class moves" on public.student_class_moves for select using (owner_id = auth.uid());
-- Rows are only written by the trigger below

create or replace function public.record_class_move()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.class_id is distinct from old.class_id then
    insert into student_class_moves (owner_id, student_id, class_id, class_name, class_level, moved_at)
    select new.owner_id, new.id, c.id, c.name, c.level, case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end
    from classes c where c.id = new.class_id;
  end if;
  return new;
end $$;

drop trigger if exists students_record_class_move on public.students;
create trigger students_record_class_move after insert or update of class_id on public.students
  for each row execute function public.record_class_move();

-- Students who already exist: their current class from the day they were added
insert into public.student_class_moves (owner_id, student_id, class_id, class_name, class_level, moved_at)
select s.owner_id, s.id, c.id, c.name, c.level, s.created_at
from public.students s join public.classes c on c.id = s.class_id
where not exists (select 1 from public.student_class_moves m where m.student_id = s.id);

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
    'classLevel', (select level from classes where id = s.class_id),
    -- When the student moved class, so each discovery comes from the camp they were in at the time
    'moves', coalesce((select jsonb_agg(jsonb_build_object('at', m.moved_at, 'className', m.class_name, 'classLevel', m.class_level) order by m.moved_at)
      from student_class_moves m where m.student_id = s.id), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color,
        'points', coalesce((select sum(a.points) from awards a where a.student_id = s.id and a.category_id = c.id), 0),
        'count', (select count(*) from awards a where a.student_id = s.id and a.category_id = c.id))
        order by c.position)
      from award_categories c where c.class_id = s.class_id), '[]'::jsonb),
    'totalPoints', coalesce((select sum(points) from awards where student_id = s.id), 0),
    -- Every award (points and time) so the page can work out the discovery journey
    'awardLog', coalesce((select jsonb_agg(jsonb_build_object('points', a.points, 'at', a.created_at) order by a.created_at)
      from awards a where a.student_id = s.id), '[]'::jsonb),
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
