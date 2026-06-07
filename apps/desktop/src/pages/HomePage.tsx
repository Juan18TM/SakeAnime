import React, { useState, useEffect } from 'react';
import { Play, Plus, ChevronRight } from 'lucide-react';
import { extensionRegistry } from '../services/ExtensionRegistry';
import type { AnimeEntry } from '../services/ExtensionRegistry';

export const HomePage: React.FC<{ onAnimeSelect?: (url: string, providerId: string) => void }> = ({ onAnimeSelect }) => {
  const [latestAnime, setLatestAnime] = useState<AnimeEntry[]>([]);
  const [heroAnime, setHeroAnime] = useState<AnimeEntry | null>(null);

  useEffect(() => {
    // Fetch real data from extensions
    extensionRegistry.latestAll(1).then((data) => {
      if (data.length > 0) {
        setHeroAnime(data[0]);
        setLatestAnime(data.slice(1, 11)); // Next 10 items
      }
    });
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* ─── Hero Banner ─── */}
      <section className="relative w-full h-[55vh] min-h-[420px] max-h-[580px] overflow-hidden bg-surface-container-highest">
        {heroAnime && (
          <>
            {/* Background Image */}
            <img
              src={heroAnime.poster || ''}
              alt={heroAnime.title}
              className="absolute inset-0 w-full h-full object-cover opacity-60 blur-sm scale-105"
            />
            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#080B12] via-[#080B12]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B12] via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-10 w-full md:w-3/5 flex flex-col gap-4">
              {/* Genres & Provider */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary uppercase">
                  {heroAnime.provider}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/10 text-white/70 border border-white/10">
                  {heroAnime.type || 'TV'}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl font-bold text-white leading-tight font-display drop-shadow-2xl">
                {heroAnime.title}
              </h1>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => onAnimeSelect?.(heroAnime.url, heroAnime.provider)}
                  className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-primary-glow active:scale-95"
                >
                  <Play size={20} fill="currentColor" />
                  Ver Detalles
                </button>
                <button className="flex items-center gap-2 px-6 py-4 glass hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95">
                  <Plus size={20} />
                  Guardar
                </button>
              </div>
            </div>
            
            {/* Hero Side Poster */}
               <div className="absolute right-12 bottom-12 w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10 hidden lg:block">
                <img src={heroAnime.poster || ''} alt="Cover" className="w-full h-full object-cover" />
             </div>
          </>
        )}
      </section>

      {/* ─── Últimos Agregados ─── */}
      <section className="px-8 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-semibold text-xl">Últimos Agregados</h2>
          <button className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium transition-colors">
            Ver Todos <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {latestAnime.map((item, i) => (
            <div
              key={`${item.provider}-${item.id}-${i}`}
              onClick={() => onAnimeSelect?.(item.url, item.provider)}
              className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/0 hover:border-primary/30 transition-all duration-300"
              style={{ background: '#181E28' }}
            >
              <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white/60 font-medium uppercase">
                {item.provider}
              </div>

              <div className="h-52 overflow-hidden bg-white/5">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-primary-glow">
                    <Play size={22} className="text-white ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>

              <div className="p-3 flex flex-col gap-1">
                <p className="text-white text-sm font-semibold line-clamp-2 leading-tight">{item.title}</p>
                <p className="text-muted text-[10px] uppercase font-medium mt-1">{item.type || 'Episodio'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
