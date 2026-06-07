import React, { useState, useEffect } from 'react';
import { Heart, Trash2 } from 'lucide-react';

interface FavoriteEntry {
  url: string;
  providerId: string;
  title: string;
  poster: string;
}

export const FavoritesPage: React.FC<{ onAnimeSelect?: (url: string, providerId: string) => void }> = ({ onAnimeSelect }) => {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sake-favorites');
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  const removeFavorite = (url: string) => {
    const updated = favorites.filter(f => f.url !== url);
    setFavorites(updated);
    localStorage.setItem('sake-favorites', JSON.stringify(updated));
  };

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Heart size={28} className="text-gray-600" />
        </div>
        <p className="text-white font-medium">Sin favoritos</p>
        <p className="text-sm">Agrega animes a tus favoritos desde su página</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Favoritos</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {favorites.map((entry) => (
          <div key={entry.url} className="group relative flex flex-col gap-2">
            <button
              onClick={() => onAnimeSelect?.(entry.url, entry.providerId)}
              className="text-left"
            >
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-primary/30 transition-all">
                {entry.poster ? (
                  <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">🎬</div>
                )}
              </div>
              <p className="text-sm text-gray-300 font-medium line-clamp-2 group-hover:text-white transition-colors mt-2">{entry.title}</p>
            </button>
            <button
              onClick={() => removeFavorite(entry.url)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-400 hover:text-red-400 hover:bg-red-400/15 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
