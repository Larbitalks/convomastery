-- Optional starter topic areas. Run after 0001_init.sql.
insert into public.categories (name, slug, description) values
  ('Everyday life', 'everyday-life', 'Family, sleep, habits and the routines everyone can talk about.'),
  ('Society and money', 'society-and-money', 'Work, money, fairness and the choices people make.'),
  ('Science and tech', 'science-and-tech', 'Screens, AI, health and the future.'),
  ('Culture and travel', 'culture-and-travel', 'Food, places, traditions and luck.')
on conflict (slug) do nothing;
