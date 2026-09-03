-- Fase 1: profili utente, ruoli, auto-creazione profilo alla registrazione.
-- Incolla ed esegui questo script nel SQL Editor di Supabase (Dashboard -> SQL Editor -> New query).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'portiere' check (role in ('admin', 'portiere')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Impedisce che un utente possa auto-promuoversi ad admin modificando il proprio profilo dal client.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- Crea automaticamente una riga in profiles quando un nuovo utente si registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'portiere');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Funzione helper usata dalle policy RLS di tutte le altre tabelle (Fase 2).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Dopo esserti registrato nell'app almeno una volta, esegui questa riga
-- (sostituendo l'email se necessario) per diventare admin:
-- update public.profiles set role = 'admin' where email = 'bravi.federico7@gmail.com';
