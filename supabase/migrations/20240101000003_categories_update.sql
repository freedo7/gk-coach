alter table public.exercises
  add column if not exists difficulty text check (difficulty in ('base', 'intermedio', 'avanzato')),
  add column if not exists duration_minutes int,
  add column if not exists equipment text;

alter table public.exercise_categories
  add column if not exists icon text;

delete from public.exercises;
delete from public.exercise_categories;

insert into public.exercise_categories (name, icon, sort_order) values
  ('Tecnica di base', 'body-outline', 1),
  ('Coordinazione e mobilità', 'accessibility-outline', 2),
  ('Forza e reattività', 'flash-outline', 3),
  ('Tecnica situazionale', 'shield-outline', 4),
  ('Tecnica podalica', 'football-outline', 5);
