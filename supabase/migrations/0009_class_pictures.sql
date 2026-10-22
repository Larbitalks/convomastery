-- Optional picture for each class (a small image stored with the class). Run after 0008. Safe to run more than once.
alter table public.classes add column if not exists image text;
alter table public.classes drop constraint if exists classes_image_size;
alter table public.classes add constraint classes_image_size check (image is null or (image like 'data:image/%' and length(image) < 400000));
