-- When a student (or a parent) last opened their progress page. Only the teacher sees this.
-- Run after 0019. Safe to run more than once.

alter table public.students add column if not exists last_viewed_at timestamptz;
alter table public.students add column if not exists view_count integer not null default 0;

-- Called by the progress page when it opens. The teacher's own visits are not counted,
-- and opening the page again within 30 minutes counts as the same visit.
create or replace function public.mark_progress_viewed(p_code text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  s students;
begin
  if length(v_code) < 10 then return; end if;
  select * into s from students where replace(share_code, '-', '') = v_code;
  if s.id is null or s.owner_id = auth.uid() then return; end if;
  update students set
    view_count = view_count + case when last_viewed_at is null or last_viewed_at < now() - interval '30 minutes' then 1 else 0 end,
    last_viewed_at = now()
  where id = s.id;
end $$;
grant execute on function public.mark_progress_viewed(text) to anon, authenticated;
