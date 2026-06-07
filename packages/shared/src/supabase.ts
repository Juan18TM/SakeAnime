import { createClient } from '@supabase/supabase-js';

// In a real desktop app, we would load these from a secure store or environment variables
// For now, we mock the URLs so the application compiles
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  stats: {
    anime_watched: number;
    manga_read: number;
    time: number;
  };
};

export type AnimeProgress = {
  id: string;
  user_id: string;
  anime_id: string;
  provider_id: string;
  status: 'watching' | 'completed' | 'planned' | 'dropped';
  episodes_watched: number;
  last_watched_at: string;
};

export type MangaProgress = {
  id: string;
  user_id: string;
  manga_id: string;
  provider_id: string;
  status: 'reading' | 'completed' | 'planned' | 'dropped';
  chapters_read: number;
  last_read_at: string;
};
