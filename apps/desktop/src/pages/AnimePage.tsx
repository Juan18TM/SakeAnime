import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { extensionRegistry } from '../services/ExtensionRegistry';
import type { AnimeEntry } from '../services/ExtensionRegistry';
import { ANIME_GENRES } from '../constants/animeGenres';
import { fetchFromBrowseProviders, mergeAnimeEntries, dedupeAnimeEntries, PROVIDER_LABELS } from '../utils/browseProviders';
import clsx from 'clsx';

const SOURCE_FILTERS = [
  { id: 'all', label: 'Todas las fuentes' },
  { id: 'tioanime', label: 'TioAnime' },
  { id: 'animefenix2', label: 'AnimeFenix' },
] as const;

export type AnimePageProps = {
  onAnimeSelect?: (url: string, providerId: string) => void;
  initialProvider?: string;
};

export const AnimePage: React.FC<AnimePageProps> = ({ onAnimeSelect, initialProvider = 'all' }) => {
  const [results, setResults] = useState<AnimeEntry[]>([]);
  const [query, setQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<string>(initialProvider);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchAnime = useCallback(async (
    q: string,
    prov: string,
    genre: string | null,
    pg: number,
    append = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      let data: AnimeEntry[] = [];

      if (genre) {
        if (prov === 'all') {
          data = await fetchFromBrowseProviders(id =>
            extensionRegistry.browseByGenre(id, genre, pg)
          );
        } else {
          data = await extensionRegistry.browseByGenre(prov, genre, pg);
        }
      } else if (q.trim()) {
        if (prov === 'all') {
          data = await fetchFromBrowseProviders(id => {
            const provider = extensionRegistry.getProvider(id);
            return provider ? provider.search(q, pg) : Promise.resolve([]);
          });
        } else {
          const provider = extensionRegistry.getProvider(prov);
          if (!provider) {
            data = await extensionRegistry.searchAll(q, pg);
          } else {
            try {
              data = await provider.search(q, pg);
            } catch (err) {
              setError((err as Error)?.message || 'Error en la búsqueda, mostrando todas las fuentes');
              data = await extensionRegistry.searchAll(q, pg);
            }
          }
        }
      } else if (prov === 'all') {
        data = await fetchFromBrowseProviders(id => {
          const provider = extensionRegistry.getProvider(id);
          return provider ? provider.latest(pg) : Promise.resolve([]);
        });
      } else {
        const provider = extensionRegistry.getProvider(prov);
        if (!provider) {
          data = await extensionRegistry.latestAll(pg);
        } else {
          try {
            data = await provider.latest(pg);
          } catch (err) {
            setError((err as Error)?.message || 'Error al cargar, mostrando todas las fuentes');
            data = await extensionRegistry.latestAll(pg);
          }
        }
      }

      if (append) {
        setResults(prev => {
          const { merged, added } = mergeAnimeEntries(prev, data);
          setHasMore(added > 0 && data.length > 0);
          return merged;
        });
      } else {
        const unique = dedupeAnimeEntries(data);
        setResults(unique);
        setHasMore(unique.length >= 15);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar anime');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAndFetch = useCallback((q: string, prov: string, genre: string | null) => {
    setPage(1);
    setResults([]);
    fetchAnime(q, prov, genre, 1);
  }, [fetchAnime]);

  useEffect(() => {
    resetAndFetch(query, activeProvider, activeGenre);
  }, [activeProvider, activeGenre]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (activeGenre) setActiveGenre(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setResults([]);
      fetchAnime(value, activeProvider, null, 1);
    }, 600);
  };

  const handleGenreSelect = (genreId: string | null) => {
    setQuery('');
    setActiveGenre(genreId);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAnime(query, activeProvider, activeGenre, next, true);
  };

  const providerLabel = SOURCE_FILTERS.find(p => p.id === activeProvider)?.label ?? 'Todas las fuentes';
  const genreLabel = activeGenre ? ANIME_GENRES.find(g => g.id === activeGenre)?.label : null;
  const pageTitle = genreLabel
    ? genreLabel
    : query
      ? 'Resultados de búsqueda'
      : 'Últimos agregados';

  const pageSubtitle = genreLabel || query
    ? `${providerLabel}${query ? ` · "${query}"` : ''}`
    : `${providerLabel} · Los anime más recientes`;

  return (
    <div className="flex flex-col gap-6 px-8 py-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white font-display">{pageTitle}</h1>
        <p className="text-muted text-sm">{pageSubtitle}</p>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-card border border-white/8 rounded-xl py-3 pl-11 pr-5 text-white placeholder-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
            placeholder="Buscar anime..."
          />
        </div>
        <button
          onClick={() => resetAndFetch(query, activeProvider, activeGenre)}
          disabled={loading}
          className="p-3 bg-card border border-white/8 rounded-xl text-muted hover:text-white hover:border-white/20 transition-all active:scale-95"
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtro por fuente */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted font-medium uppercase tracking-wide">Fuente</p>
        <div className="flex gap-2 flex-wrap">
          {SOURCE_FILTERS.map(p => (
            <button
              key={p.id}
              onClick={() => { setActiveProvider(p.id); setPage(1); setResults([]); }}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                activeProvider === p.id
                  ? 'bg-primary/10 border-primary/50 text-primary'
                  : 'bg-card border-white/8 text-muted hover:text-white hover:border-white/20'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por género */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted font-medium uppercase tracking-wide">Categorías / Géneros</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleGenreSelect(null)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0',
              activeGenre === null
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-card border-white/8 text-muted hover:text-white hover:border-white/20'
            )}
          >
            Todos
          </button>
          {ANIME_GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => handleGenreSelect(g.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0',
                activeGenre === g.id
                  ? 'bg-primary/10 border-primary/50 text-primary'
                  : 'bg-card border-white/8 text-muted hover:text-white hover:border-white/20'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={18} />
          <div>
            <p className="text-sm font-medium">Error al cargar anime</p>
            <p className="text-xs opacity-70 mt-0.5">{error}</p>
          </div>
          <button onClick={() => resetAndFetch(query, activeProvider, activeGenre)} className="ml-auto text-xs underline">
            Reintentar
          </button>
        </div>
      )}

      {results.length > 0 ? (
        <>
          <p className="text-muted text-sm">{results.length} anime encontrados</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((item, i) => (
              <AnimeCard key={`${item.provider}-${item.id}-${i}`} item={item} onSelect={onAnimeSelect} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-card border border-white/8 hover:border-primary/30 rounded-xl text-sm text-muted hover:text-white transition-all active:scale-95"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Cargar más
              </button>
            </div>
          )}
        </>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: '#181E28' }}>
              <div className="h-52 bg-white/5" />
              <div className="p-3 flex flex-col gap-2">
                <div className="h-3 bg-white/5 rounded" />
                <div className="h-2 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center">
              <Search size={28} className="text-muted" />
            </div>
            <p className="text-white font-medium">No se encontraron resultados</p>
            <p className="text-muted text-sm">Prueba otra búsqueda, fuente o categoría</p>
          </div>
        )
      )}
    </div>
  );
};

const AnimeCard: React.FC<{ item: AnimeEntry; onSelect?: (url: string, providerId: string) => void }> = ({ item, onSelect }) => {
  const [imgError, setImgError] = useState(false);
  const [posterSrc, setPosterSrc] = useState<string>(item.poster);

  useEffect(() => {
    setPosterSrc(item.poster);
    setImgError(false);
  }, [item.poster]);

  return (
    <div
      onClick={() => onSelect?.(item.url, item.provider)}
      className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/0 hover:border-primary/30 transition-all duration-300"
      style={{ background: '#181E28' }}
    >
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white/60 font-medium uppercase">
        {PROVIDER_LABELS[item.provider] ?? item.provider}
      </div>

      <div className="h-52 overflow-hidden bg-white/5">
        {!imgError && posterSrc ? (
          <img
            src={posterSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs p-4 text-center">
            {item.title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-3 flex flex-col gap-1">
        <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{item.title}</p>
        {item.type && <span className="text-[10px] text-muted font-medium uppercase">{item.type}</span>}
      </div>
    </div>
  );
};
