-- The mountain map: every student of a teacher shown on one trail, by name, unless the teacher hides them.
-- Run after 0013. Safe to run more than once.

alter table public.students add column if not exists show_on_map boolean not null default true;

-- Everyone on the map, seen with one student's progress code. Only what the map needs is shared:
-- name, class (for the camp) and point totals (for how far up the camp they are). Nothing else.
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
      'name', x.name, 'me', x.id = s.id, 'className', c.name, 'classLevel', c.level,
      'total', coalesce((select sum(a.points) from awards a where a.student_id = x.id), 0),
      'atMove', coalesce((select sum(a.points) from awards a where a.student_id = x.id
        and a.created_at < (select max(m.moved_at) from student_class_moves m where m.student_id = x.id)), 0)
    ) order by x.name)
    from students x join classes c on c.id = x.class_id
    where x.owner_id = s.owner_id and (x.show_on_map or x.id = s.id)), '[]'::jsonb);
end $$;
grant execute on function public.student_map(text) to anon, authenticated;
