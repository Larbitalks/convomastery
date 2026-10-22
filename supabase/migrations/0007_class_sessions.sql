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
