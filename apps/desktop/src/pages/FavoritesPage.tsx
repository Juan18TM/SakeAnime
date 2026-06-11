import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Trash2, LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { getFavorites, removeFavorite } from '../services/favoritesService';
import type { AnimeFavorite } from '../types/database';
import { AuthModal } from '../components/AuthModal';

export const FavoritesPage: React.FC<{ onAnimeSelect?: (url: string, providerId: string) => void }> = ({ onAnimeSelect }) => {
  const { user, initialized } = useAuthStore();
  const [favorites, setFavorites] = useState<AnimeFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getFavorites(user.id);
      setFavorites(data);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadFavorites();
    else setFavorites([]);
  }, [user, loadFavorites]);

  const handleRemove = async (entry: AnimeFavorite) => {
    if (!user) return;
    await removeFavorite(user.id, entry.url, entry.provider_id);
    setFavorites((prev) => prev.filter((f) => f.id !== entry.id));
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Heart size={28} className="text-gray-600" />
          </div>
          <p className="text-white font-medium">Inicia sesión para ver tus favoritos</p>
          <p className="text-sm text-center max-w-sm">
            Puedes explorar la app sin cuenta, pero tus animes favoritos solo se guardan cuando inicias sesión.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all"
          >
            <LogIn size={16} />
            Iniciar sesión
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Heart size={28} className="text-gray-600" />
        </div>
        <p className="text-white font-medium">Sin favoritos</p>
        <p className="text-sm">Agrega animes a tus favoritos desde su página de detalle</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6 font-display">Favoritos</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {favorites.map((entry) => (
          <div key={entry.id} className="group relative flex flex-col gap-2">
            <button
              onClick={() => onAnimeSelect?.(entry.url, entry.provider_id)}
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
              onClick={() => handleRemove(entry)}
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
