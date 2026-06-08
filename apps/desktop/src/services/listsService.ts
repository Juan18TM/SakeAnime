// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { AnimeList, AnimeListItem, AnimeListWithCount, ListAnimeInput } from '../types/database';

export async function getLists(userId: string): Promise<AnimeListWithCount[]> {
  if (!supabase) return [];
  const { data: lists, error } = await supabase
    .from('anime_lists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!lists?.length) return [];

  const { data: items, error: itemsError } = await supabase
    .from('anime_list_items')
    .select('list_id')
    .eq('user_id', userId);
  if (itemsError) throw new Error(itemsError.message);

  const counts = new Map<string, number>();
  for (const item of items ?? []) {
    counts.set(item.list_id, (counts.get(item.list_id) ?? 0) + 1);
  }

  return lists.map((list) => ({
    ...list,
    item_count: counts.get(list.id) ?? 0,
  }));
}

export async function createList(userId: string, name: string, description = ''): Promise<AnimeList> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('anime_lists')
    .insert({ user_id: userId, name: name.trim(), description: description.trim() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateList(
  userId: string,
  listId: string,
  updates: { name?: string; description?: string }
): Promise<AnimeList> {
  if (!supabase) throw new Error('Supabase no configurado');
  const payload: Record<string, string> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();

  const { data, error } = await supabase
    .from('anime_lists')
    .update(payload)
    .eq('id', listId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteList(userId: string, listId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('anime_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function getListItems(listId: string): Promise<AnimeListItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('anime_list_items')
    .select('*')
    .eq('list_id', listId)
    .order('added_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addAnimeToList(
  userId: string,
  listId: string,
  entry: ListAnimeInput
): Promise<AnimeListItem> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase
    .from('anime_list_items')
    .insert({
      list_id: listId,
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

  await supabase
    .from('anime_lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', listId)
    .eq('user_id', userId);

  return data;
}

export async function removeAnimeFromList(
  userId: string,
  listId: string,
  url: string,
  providerId: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('anime_list_items')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId)
    .eq('url', url)
    .eq('provider_id', providerId);
  if (error) throw new Error(error.message);
}

export async function getAnimeListMembership(
  userId: string,
  url: string,
  providerId: string
): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('anime_list_items')
    .select('list_id')
    .eq('user_id', userId)
    .eq('url', url)
    .eq('provider_id', providerId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.list_id);
}

export async function isAnimeInList(
  listId: string,
  url: string,
  providerId: string
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('anime_list_items')
    .select('id')
    .eq('list_id', listId)
    .eq('url', url)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

