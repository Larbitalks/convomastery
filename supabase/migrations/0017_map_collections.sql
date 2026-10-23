-- Mountain map: clicking a student shows the discoveries they have collected.
-- Sends each visible student's award history and class moves, so their collection can be worked out. Run after 0016. Safe to run more than once.

create or replace function public.student_map(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
begin
  if length(v_code) < 10 then return null; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', x.name, 'avatar', x.avatar, 'me', x.id = s.id, 'className', c.name, 'classLevel', c.level,
      'total', coalesce((select sum(a.points) from awards a where a.student_id = x.id), 0),
      'atMove', coalesce((select sum(a.points) from awards a where a.student_id = x.id
        and a.created_at < (select max(m.moved_at) from student_class_moves m where m.student_id = x.id)), 0),
      -- What they have found is worked out from these, the same way as on their own page
      'log', coalesce((select jsonb_agg(jsonb_build_object('points', a.points, 'at', a.created_at) order by a.created_at)
        from awards a where a.student_id = x.id), '[]'::jsonb),
      'moves', coalesce((select jsonb_agg(jsonb_build_object('at', m.moved_at, 'className', m.class_name, 'classLevel', m.class_level) order by m.moved_at)
        from student_class_moves m where m.student_id = x.id), '[]'::jsonb)
    ) order by x.name)
    from students x join classes c on c.id = x.class_id
    where x.owner_id = s.owner_id and (x.show_on_map or x.id = s.id)), '[]'::jsonb);
end $$;
grant execute on function public.student_map(text) to anon, authenticated;
