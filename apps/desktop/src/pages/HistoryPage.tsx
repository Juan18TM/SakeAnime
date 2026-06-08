import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Trash2, LogIn, Loader2, Check, Play } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { getWatchedEpisodes, clearWatchedHistory } from '../services/watchedService';
import type { WatchedEpisode } from '../types/database';
import { AuthModal } from '../components/AuthModal';

export const HistoryPage: React.FC<{
  onAnimeSelect?: (url: string, providerId: string) => void;
  onPlayEpisode?: (episodeUrl: string, providerId: string, anime: { url: string; title: string; poster: string }, episode: { number: number; title: string }) => void;
}> = ({ onAnimeSelect, onPlayEpisode }) => {
  const { user, initialized } = useAuthStore();
  const [history, setHistory] = useState<WatchedEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getWatchedEpisodes(user.id);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadHistory();
    else setHistory([]);
  }, [user, loadHistory]);

  const handleClear = async () => {
    if (!user) return;
    await clearWatchedHistory(user.id);
    setHistory([]);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
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
            <Clock size={28} className="text-gray-600" />
          </div>
          <p className="text-white font-medium">Inicia sesión para ver tu historial</p>
          <p className="text-sm text-center max-w-sm">
            Los episodios que marques como vistos se guardarán aquí para que retomes donde lo dejaste.
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

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Clock size={28} className="text-gray-600" />
        </div>
        <p className="text-white font-medium">Sin historial</p>
        <p className="text-sm">Marca episodios como vistos desde la página del anime o el reproductor</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Historial</h1>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <Trash2 size={14} />
          Limpiar
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-white/5 hover:border-primary/30 transition-all"
          >
            <button
              onClick={() => onAnimeSelect?.(entry.anime_url, entry.provider_id)}
              className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0"
            >
              {entry.anime_poster ? (
                <img src={entry.anime_poster} alt={entry.anime_title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">🎬</div>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onAnimeSelect?.(entry.anime_url, entry.provider_id)}
                className="text-sm text-white font-medium truncate hover:text-primary transition-colors text-left w-full"
              >
                {entry.anime_title}
              </button>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-primary font-bold">EP {entry.episode_number}</span>
                <span className="text-xs text-gray-400 truncate">{entry.episode_title}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500">
                <Check size={10} className="text-green-400" />
                <span>Visto · {formatDate(entry.watched_at)}</span>
              </div>
            </div>
            <button
              onClick={() =>
                onPlayEpisode?.(
                  entry.episode_url,
                  entry.provider_id,
                  { url: entry.anime_url, title: entry.anime_title, poster: entry.anime_poster },
                  { number: entry.episode_number, title: entry.episode_title }
                )
              }
              className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-primary flex items-center justify-center shrink-0 transition-colors"
              title="Reproducir episodio"
            >
              <Play size={16} className="text-white ml-0.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
