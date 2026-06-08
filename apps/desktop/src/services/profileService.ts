// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

const AVATAR_BUCKET = 'avatars';
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[file.type] ?? 'jpg';
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase no configurado');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no válido. Usa JPG, PNG, WEBP o GIF.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('La imagen no puede superar 2 MB.');
  }

  const ext = getExtension(file);
  const filePath = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return data.avatar_url ?? avatarUrl;
}

export async function removeAvatar(userId: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase no configurado');

  const extensions = ['jpg', 'png', 'webp', 'gif'];
  await Promise.all(
    extensions.map((ext) =>
      supabase!.storage.from(AVATAR_BUCKET).remove([`${userId}/avatar.${ext}`])
    )
  );

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: '' })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateUsername(userId: string, username: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase no configurado');
  const trimmed = username.trim();
  if (!trimmed) throw new Error('El nombre no puede estar vacío.');

  const { data, error } = await supabase
    .from('profiles')
    .update({ username: trimmed })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

