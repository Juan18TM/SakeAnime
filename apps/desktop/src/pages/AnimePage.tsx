import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { extensionRegistry } from '../services/ExtensionRegistry';
import type { AnimeEntry } from '../services/ExtensionRegistry';
import clsx from 'clsx';

const PROVIDERS = extensionRegistry.getAllProviders();

export const AnimePage: React.FC<{ onAnimeSelect?: (url: string, providerId: string) => void }> = ({ onAnimeSelect }) => {
  const [results, setResults] = useState<AnimeEntry[]>([]);
  const [query, setQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchAnime = useCallback(async (q: string, prov: string, pg: number, append = false) => {
    setLoading(true);
    setError(null);
    try {
      let data: AnimeEntry[] = [];

      if (q.trim()) {
        if (prov === 'all') {
          data = await extensionRegistry.searchAll(q, pg);
        } else {
          const provider = extensionRegistry.getProvider(prov);
          // If provider is missing or not active, fallback to searchAll to avoid empty/error state
          if (!provider) {
            data = await extensionRegistry.searchAll(q, pg);
          } else {
            try {
              data = await provider.search(q, pg);
            } catch (err) {
              // If provider search fails, fallback to aggregated search
              setError((err as any)?.message || 'Provider search failed, falling back to all sources');
              data = await extensionRegistry.searchAll(q, pg);
            }
          }
        }
      } else {
        if (prov === 'all') {
          data = await extensionRegistry.latestAll(pg);
        } else {
          const provider = extensionRegistry.getProvider(prov);
          if (!provider) {
            data = await extensionRegistry.latestAll(pg);
          } else {
            try {
              data = await provider.latest(pg);
            } catch (err) {
              setError((err as any)?.message || 'Provider latest failed, falling back to all sources');
              data = await extensionRegistry.latestAll(pg);
            }
          }
        }
      }

      setHasMore(data.length >= 20);
      setResults(prev => append ? [...prev, ...data] : data);
    } catch (err: any) {
      setError(err.message || 'Error fetching anime');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAnime('', activeProvider, 1);
  }, [activeProvider]);

  // Debounced search
  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchAnime(value, activeProvider, 1);
    }, 600);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAnime(query, activeProvider, next, true);
  };

  return (
    <div className="flex flex-col gap-6 px-8 py-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white font-display">Anime</h1>
        <p className="text-muted text-sm">Browse from all your installed providers</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-card border border-white/8 rounded-xl py-3 pl-11 pr-5 text-white placeholder-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
            placeholder="Search anime..."
          />
        </div>

        {/* Provider Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setActiveProvider('all'); setPage(1); setResults([]); }}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              activeProvider === 'all'
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-card border-white/8 text-muted hover:text-white hover:border-white/20'
            )}
          >
            All Sources
          </button>
          {PROVIDERS.filter(p => p.type === 'anime').map(p => (
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
              {p.name}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchAnime(query, activeProvider, 1)}
          disabled={loading}
          className="p-3 bg-card border border-white/8 rounded-xl text-muted hover:text-white hover:border-white/20 transition-all active:scale-95"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={18} />
          <div>
            <p className="text-sm font-medium">Error loading anime</p>
            <p className="text-xs opacity-70 mt-0.5">{error}</p>
          </div>
          <button onClick={() => fetchAnime(query, activeProvider, 1)} className="ml-auto text-xs underline">
            Retry
          </button>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((item, i) => (
              <AnimeCard key={`${item.provider}-${item.id}-${i}`} item={item} onSelect={onAnimeSelect} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-card border border-white/8 hover:border-primary/30 rounded-xl text-sm text-muted hover:text-white transition-all active:scale-95"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Load More
              </button>
            </div>
          )}
        </>
      ) : loading ? (
        // Skeleton
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
            <p className="text-white font-medium">No results found</p>
            <p className="text-muted text-sm">Try a different search or check your extensions</p>
          </div>
        )
      )}
    </div>
  );
};

// ─── Anime Card (simple, use session interceptor for hotlink protection) ───
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
        {item.provider}
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
