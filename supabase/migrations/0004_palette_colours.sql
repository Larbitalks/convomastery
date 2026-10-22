-- Optional: new default award colours to match the site's palette. Safe to run any time.
create or replace function public.add_default_award_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into award_categories (owner_id, class_id, name, points, color, position) values
    (new.owner_id, new.id, 'Participation', 1, '#46725D', 0),
    (new.owner_id, new.id, 'Great answer', 2, '#5B6C8F', 1),
    (new.owner_id, new.id, 'New vocabulary', 1, '#7A5C8C', 2),
    (new.owner_id, new.id, 'Teamwork', 1, '#9A6A1F', 3),
    (new.owner_id, new.id, 'Homework', 2, '#3D405B', 4);
  return new;
end $$;
alter table public.lessons alter column cover_color set default '#3D405B';
