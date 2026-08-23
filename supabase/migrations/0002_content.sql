-- Fase 2: categorie esercizi, esercizi, allenamenti, partite.
-- Incolla ed esegui questo script nel SQL Editor di Supabase (Dashboard -> SQL Editor -> New query).

create table public.exercise_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

alter table public.exercise_categories enable row level security;

create policy "categories_select_authenticated"
  on public.exercise_categories for select to authenticated using (true);
create policy "categories_admin_insert"
  on public.exercise_categories for insert to authenticated with check (is_admin());
create policy "categories_admin_update"
  on public.exercise_categories for update to authenticated using (is_admin()) with check (is_admin());
create policy "categories_admin_delete"
  on public.exercise_categories for delete to authenticated using (is_admin());

insert into public.exercise_categories (name, sort_order) values
  ('Riflessi', 1), ('Uscite', 2), ('Presa alta', 3),
  ('Gioco con i piedi', 4), ('Posizionamento', 5), ('Uno contro uno', 6), ('Rilanci', 7);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category_id uuid not null references public.exercise_categories(id),
  video_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_category_id_idx on public.exercises(category_id);

alter table public.exercises enable row level security;
create policy "exercises_select_authenticated" on public.exercises for select to authenticated using (true);
create policy "exercises_admin_insert" on public.exercises for insert to authenticated with check (is_admin());
create policy "exercises_admin_update" on public.exercises for update to authenticated using (is_admin()) with check (is_admin());
create policy "exercises_admin_delete" on public.exercises for delete to authenticated using (is_admin());

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  training_date date not null,
  training_time time,
  title text not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trainings_date_idx on public.trainings(training_date);

alter table public.trainings enable row level security;
create policy "trainings_select_authenticated" on public.trainings for select to authenticated using (true);
create policy "trainings_admin_insert" on public.trainings for insert to authenticated with check (is_admin());
create policy "trainings_admin_update" on public.trainings for update to authenticated using (is_admin()) with check (is_admin());
create policy "trainings_admin_delete" on public.trainings for delete to authenticated using (is_admin());

create table public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null default 0,
  note text,
  unique (training_id, exercise_id)
);
create index training_exercises_training_idx on public.training_exercises(training_id);
create index training_exercises_exercise_idx on public.training_exercises(exercise_id);

alter table public.training_exercises enable row level security;
create policy "training_exercises_select_authenticated" on public.training_exercises for select to authenticated using (true);
create policy "training_exercises_admin_insert" on public.training_exercises for insert to authenticated with check (is_admin());
create policy "training_exercises_admin_update" on public.training_exercises for update to authenticated using (is_admin()) with check (is_admin());
create policy "training_exercises_admin_delete" on public.training_exercises for delete to authenticated using (is_admin());

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  opponent text not null,
  is_home boolean not null,
  match_date date not null,
  match_time time,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matches_date_idx on public.matches(match_date);

alter table public.matches enable row level security;
create policy "matches_select_authenticated" on public.matches for select to authenticated using (true);
create policy "matches_admin_insert" on public.matches for insert to authenticated with check (is_admin());
create policy "matches_admin_update" on public.matches for update to authenticated using (is_admin()) with check (is_admin());
create policy "matches_admin_delete" on public.matches for delete to authenticated using (is_admin());

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_exercises_updated_at before update on public.exercises for each row execute function public.set_updated_at();
create trigger trg_trainings_updated_at before update on public.trainings for each row execute function public.set_updated_at();
create trigger trg_matches_updated_at before update on public.matches for each row execute function public.set_updated_at();
