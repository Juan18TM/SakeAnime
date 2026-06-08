// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { AnimeFavorite, FavoriteInput } from '../types/database';

export async function getFavorites(userId: string): Promise<AnimeFavorite[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('anime_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addFavorite(userId: string, entry: FavoriteInput): Promise<AnimeFavorite> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('anime_favorites')
    .insert({
      user_id: userId,
      url: entry.url,
      provider_id: entry.providerId,
      title: entry.title,
      poster: entry.poster,
      anime_type: entry.animeType ?? '',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeFavorite(userId: string, url: string, providerId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('anime_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('url', url)
    .eq('provider_id', providerId);
  if (error) throw new Error(error.message);
}

export async function isFavorite(userId: string, url: string, providerId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('anime_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('url', url)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

