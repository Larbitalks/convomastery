-- More options for lessons: CEFR levels from Pre-A1 to C2 (plus "All levels"), more student groups,
-- and more topic areas. Activities were already free text. Run after 0015. Safe to run more than once.

alter table public.lessons drop constraint if exists lessons_level_check;
alter table public.lessons add constraint lessons_level_check
  check (level in ('Pre-A1', 'A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2', 'All levels'));

alter table public.lessons drop constraint if exists lessons_age_group_check;
alter table public.lessons add constraint lessons_age_group_check
  check (age_group in ('Young learners', 'Kids', 'Teens', 'Young adults', 'Adults', 'Business English', 'Exam preparation', 'All ages'));

-- Activity names stay short and tidy
alter table public.lessons drop constraint if exists lessons_activity_types_check;
alter table public.lessons add constraint lessons_activity_types_check
  check (cardinality(activity_types) <= 30 and array_to_string(activity_types, '') !~ '[<>]');

insert into public.categories (name, slug, description) values
  ('Family and friends', 'family-and-friends', 'Relationships, home life and the people around us.'),
  ('School and learning', 'school-and-learning', 'Classes, studying, exams and how we learn.'),
  ('Food and cooking', 'food-and-cooking', 'Meals, recipes, restaurants and food around the world.'),
  ('Health and wellbeing', 'health-and-wellbeing', 'Sleep, sport, stress and staying healthy.'),
  ('Work and careers', 'work-and-careers', 'Jobs, interviews, the workplace and future careers.'),
  ('Technology and the internet', 'technology-and-the-internet', 'Screens, social media, AI and gadgets.'),
  ('Environment and nature', 'environment-and-nature', 'Climate, animals, weather and the planet.'),
  ('Animals', 'animals', 'Pets, wild animals and amazing creatures.'),
  ('Travel and places', 'travel-and-places', 'Trips, cities, countries and getting around.'),
  ('Culture and traditions', 'culture-and-traditions', 'Festivals, customs and how people live.'),
  ('Holidays and celebrations', 'holidays-and-celebrations', 'Birthdays, festivals and special days.'),
  ('Sports and hobbies', 'sports-and-hobbies', 'Games, free time and things we love doing.'),
  ('Entertainment and media', 'entertainment-and-media', 'Films, music, books, games and the news.'),
  ('Money and shopping', 'money-and-shopping', 'Spending, saving, shopping and value.'),
  ('Science and discovery', 'science-and-discovery', 'Space, inventions and how the world works.'),
  ('Ethics and dilemmas', 'ethics-and-dilemmas', 'Hard choices, right and wrong, and what you would do.'),
  ('Society and current issues', 'society-and-current-issues', 'Cities, fairness, rules and the news.'),
  ('Survival and adventure', 'survival-and-adventure', 'Disasters, challenges, explorers and staying alive.'),
  ('Fantasy and imagination', 'fantasy-and-imagination', 'What if, superpowers, stories and the future.'),
  ('Exam practice', 'exam-practice', 'IELTS, Cambridge and other exam-style speaking practice.')
on conflict (slug) do nothing;
