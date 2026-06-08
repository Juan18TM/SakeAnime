// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { WatchedEpisode, WatchedEpisodeInput } from '../types/database';

export async function getWatchedEpisodes(userId: string): Promise<WatchedEpisode[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('watched_episodes')
    .select('*')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getWatchedEpisodesForAnime(
  userId: string,
  animeUrl: string,
  providerId: string
): Promise<WatchedEpisode[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('watched_episodes')
    .select('*')
    .eq('user_id', userId)
    .eq('anime_url', animeUrl)
    .eq('provider_id', providerId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markEpisodeWatched(
  userId: string,
  entry: WatchedEpisodeInput
): Promise<WatchedEpisode> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('watched_episodes')
    .upsert(
      {
        user_id: userId,
        episode_url: entry.episodeUrl,
        provider_id: entry.providerId,
        anime_url: entry.animeUrl,
        anime_title: entry.animeTitle,
        anime_poster: entry.animePoster,
        episode_number: entry.episodeNumber,
        episode_title: entry.episodeTitle,
        watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider_id,episode_url' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function unmarkEpisodeWatched(
  userId: string,
  episodeUrl: string,
  providerId: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('watched_episodes')
    .delete()
    .eq('user_id', userId)
    .eq('episode_url', episodeUrl)
    .eq('provider_id', providerId);
  if (error) throw new Error(error.message);
}

export async function isEpisodeWatched(
  userId: string,
  episodeUrl: string,
  providerId: string
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('watched_episodes')
    .select('id')
    .eq('user_id', userId)
    .eq('episode_url', episodeUrl)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function clearWatchedHistory(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('watched_episodes')
    .delete()
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

