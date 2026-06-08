
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público del usuario de SakeAnime';

-- ── Favoritos de anime ───────────────────────────────────────

create table if not exists public.anime_favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  url          text not null,
  provider_id  text not null,
  title        text not null,
  poster       text not null default '',
  anime_type   text not null default '',
  created_at   timestamptz not null default now(),

  -- Un anime no puede estar duplicado por usuario/proveedor
  constraint anime_favorites_unique_entry unique (user_id, provider_id, url)
);

comment on table public.anime_favorites is 'Animes marcados como favoritos por cada usuario';

create index if not exists anime_favorites_user_id_idx
  on public.anime_favorites (user_id, created_at desc);

-- ── Row Level Security ───────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.anime_favorites enable row level security;

-- Perfiles: cada usuario solo ve/edita el suyo
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Favoritos: cada usuario solo gestiona los suyos
create policy "favorites_select_own"
  on public.anime_favorites for select
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.anime_favorites for insert
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.anime_favorites for delete
  using (auth.uid() = user_id);

-- ── Trigger: crear perfil al registrarse ─────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Trigger: actualizar updated_at en profiles ─────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
