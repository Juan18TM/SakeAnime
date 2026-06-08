
create table if not exists public.watched_episodes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  episode_url    text not null,
  provider_id    text not null,
  anime_url      text not null,
  anime_title    text not null,
  anime_poster   text not null default '',
  episode_number integer not null default 0,
  episode_title  text not null default '',
  watched_at     timestamptz not null default now(),

  constraint watched_episodes_unique_entry unique (user_id, provider_id, episode_url)
);

comment on table public.watched_episodes is 'Episodios marcados como vistos por cada usuario';

create index if not exists watched_episodes_user_id_idx
  on public.watched_episodes (user_id, watched_at desc);

create index if not exists watched_episodes_anime_idx
  on public.watched_episodes (user_id, provider_id, anime_url);

-- ── Row Level Security ───────────────────────────────────────

alter table public.watched_episodes enable row level security;

create policy "watched_select_own"
  on public.watched_episodes for select
  using (auth.uid() = user_id);

create policy "watched_insert_own"
  on public.watched_episodes for insert
  with check (auth.uid() = user_id);

create policy "watched_update_own"
  on public.watched_episodes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watched_delete_own"
  on public.watched_episodes for delete
  using (auth.uid() = user_id);
