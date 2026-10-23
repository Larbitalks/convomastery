-- Discoveries: award points unlock mountain-themed collectibles (5 points, then 15 more, then every 30).
-- Nothing new is stored: the journey is worked out from the awards already saved, so rewards can never be
-- given twice and existing awards and records stay exactly as they are.
-- This update only lets the student's progress page read their award history. Run after 0011. Safe to run more than once.

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
