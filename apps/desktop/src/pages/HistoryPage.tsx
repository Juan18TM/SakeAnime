import React, { useState, useEffect } from 'react';
import { Clock, Trash2 } from 'lucide-react';

interface HistoryEntry {
  url: string;
  providerId: string;
  title: string;
  poster: string;
  timestamp: number;
}

export const HistoryPage: React.FC<{ onAnimeSelect?: (url: string, providerId: string) => void }> = ({ onAnimeSelect }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sake-history');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('sake-history');
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Clock size={28} className="text-gray-600" />
        </div>
        <p className="text-white font-medium">Sin historial</p>
        <p className="text-sm">Los animes que veas aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Historial</h1>
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <Trash2 size={14} />
          Limpiar
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {history.map((entry) => (
          <button
            key={entry.url + entry.timestamp}
            onClick={() => onAnimeSelect?.(entry.url, entry.providerId)}
            className="group flex flex-col gap-2 text-left"
          >
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-primary/30 transition-all">
              {entry.poster ? (
                <img src={entry.poster} alt={entry.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">🎬</div>
              )}
            </div>
            <p className="text-sm text-gray-300 font-medium line-clamp-2 group-hover:text-white transition-colors">{entry.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
