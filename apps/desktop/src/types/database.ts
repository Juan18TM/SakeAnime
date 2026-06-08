export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AnimeFavorite = {
  id: string;
  user_id: string;
  url: string;
  provider_id: string;
  title: string;
  poster: string;
  anime_type: string;
  created_at: string;
};

export type AnimeList = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type AnimeListWithCount = AnimeList & {
  item_count: number;
};

export type AnimeListItem = {
  id: string;
  list_id: string;
  user_id: string;
  url: string;
  provider_id: string;
  title: string;
  poster: string;
  anime_type: string;
  added_at: string;
};

export type WatchedEpisode = {
  id: string;
  user_id: string;
  episode_url: string;
  provider_id: string;
  anime_url: string;
  anime_title: string;
  anime_poster: string;
  episode_number: number;
  episode_title: string;
  watched_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      anime_favorites: {
        Row: AnimeFavorite;
        Insert: Omit<AnimeFavorite, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AnimeFavorite, 'id' | 'user_id'>>;
      };
      watched_episodes: {
        Row: WatchedEpisode;
        Insert: Omit<WatchedEpisode, 'id' | 'watched_at'> & {
          id?: string;
          watched_at?: string;
        };
        Update: Partial<Omit<WatchedEpisode, 'id' | 'user_id'>>;
      };
      anime_lists: {
        Row: AnimeList;
        Insert: Omit<AnimeList, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AnimeList, 'id' | 'user_id'>>;
      };
      anime_list_items: {
        Row: AnimeListItem;
        Insert: Omit<AnimeListItem, 'id' | 'added_at'> & {
          id?: string;
          added_at?: string;
        };
        Update: Partial<Omit<AnimeListItem, 'id' | 'user_id' | 'list_id'>>;
      };
    };
  };
};

export type FavoriteInput = {
  url: string;
  providerId: string;
  title: string;
  poster: string;
  animeType?: string;
};

export type ListAnimeInput = {
  url: string;
  providerId: string;
  title: string;
  poster: string;
  animeType?: string;
};

export type WatchedEpisodeInput = {
  episodeUrl: string;
  providerId: string;
  animeUrl: string;
  animeTitle: string;
  animePoster: string;
  episodeNumber: number;
  episodeTitle: string;
};
