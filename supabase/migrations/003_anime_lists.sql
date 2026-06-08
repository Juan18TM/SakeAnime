
create table if not exists public.anime_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint anime_lists_unique_name unique (user_id, name)
);

comment on table public.anime_lists is 'Listas personalizadas creadas por cada usuario';

create index if not exists anime_lists_user_id_idx
  on public.anime_lists (user_id, updated_at desc);

-- ── Animes dentro de cada lista ──────────────────────────────

create table if not exists public.anime_list_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references public.anime_lists(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  url          text not null,
  provider_id  text not null,
  title        text not null,
  poster       text not null default '',
  anime_type   text not null default '',
  added_at     timestamptz not null default now(),

  constraint anime_list_items_unique_entry unique (list_id, provider_id, url)
);

comment on table public.anime_list_items is 'Animes guardados dentro de cada lista';

create index if not exists anime_list_items_list_id_idx
  on public.anime_list_items (list_id, added_at desc);

-- ── Row Level Security ───────────────────────────────────────

alter table public.anime_lists enable row level security;
alter table public.anime_list_items enable row level security;

create policy "lists_select_own"
  on public.anime_lists for select
  using (auth.uid() = user_id);

create policy "lists_insert_own"
  on public.anime_lists for insert
  with check (auth.uid() = user_id);

create policy "lists_update_own"
  on public.anime_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lists_delete_own"
  on public.anime_lists for delete
  using (auth.uid() = user_id);

create policy "list_items_select_own"
  on public.anime_list_items for select
  using (auth.uid() = user_id);

create policy "list_items_insert_own"
  on public.anime_list_items for insert
  with check (auth.uid() = user_id);

create policy "list_items_delete_own"
  on public.anime_list_items for delete
  using (auth.uid() = user_id);

-- ── Trigger: actualizar updated_at en listas ─────────────────

drop trigger if exists anime_lists_updated_at on public.anime_lists;

create trigger anime_lists_updated_at
  before update on public.anime_lists
  for each row execute function public.set_updated_at();
