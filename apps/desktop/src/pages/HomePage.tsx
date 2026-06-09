import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import type { AnimeEntry } from '../services/ExtensionRegistry';
import { fetchLatestFromBrowseProviders, mergeAnimeEntries, dedupeAnimeEntries, PROVIDER_LABELS, animeEntryKey, fetchLatestEpisodes, type LatestEpisode } from '../utils/browseProviders';
import { extensionRegistry } from '../services/ExtensionRegistry';

const INITIAL_COUNT = 10;
const HERO_INTERVAL_MS = 5000;

export const HomePage: React.FC<{
  onAnimeSelect?: (url: string, providerId: string) => void;
  onPlayEpisode?: (episodeUrl: string, providerId: string, anime: { url: string; title: string; poster: string }, episode: { number: number; title: string }) => void;
  onViewAll?: () => void;
}> = ({ onAnimeSelect, onPlayEpisode, onViewAll }) => {
  const [latestAnime, setLatestAnime] = useState<AnimeEntry[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<LatestEpisode[]>([]);
  const [featuredList, setFeaturedList] = useState<AnimeEntry[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [heroSynopsis, setHeroSynopsis] = useState<string | null>(null);
  const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null);
  const [isHeroHovering, setIsHeroHovering] = useState(false);
  const [isHeroHolding, setIsHeroHolding] = useState(false);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideDeadlineRef = useRef(0);
  const lastHeroIndexRef = useRef(0);
  const heroDetailCacheRef = useRef<Map<string, { synopsis: string; poster: string }>>(new Map());

  const isHeroPaused = isHeroHovering || isHeroHolding;

  const fetchHeroDetail = useCallback(async (entry: AnimeEntry) => {
    const key = animeEntryKey(entry);
    const cached = heroDetailCacheRef.current.get(key);
    if (cached) return cached;

    const provider = extensionRegistry.getProvider(entry.provider);
    const fallback = { synopsis: '', poster: entry.poster };
    if (!provider) {
      heroDetailCacheRef.current.set(key, fallback);
      return fallback;
    }

    try {
      const detail = await provider.detail(entry.url);
      const result = {
        synopsis: detail.synopsis?.trim() || '',
        poster: detail.poster?.trim() || entry.poster,
      };
      heroDetailCacheRef.current.set(key, result);
      return result;
    } catch {
      heroDetailCacheRef.current.set(key, fallback);
      return fallback;
    }
  }, []);

  const loadPage = useCallback(async (pg: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await fetchLatestFromBrowseProviders(pg);

      if (!append) {
        const unique = dedupeAnimeEntries(data);
        if (unique.length > 0) {
          setFeaturedList(unique);
          setHeroIndex(0);
          setLatestAnime(unique.slice(0, INITIAL_COUNT));
        } else {
          setFeaturedList([]);
          setHeroIndex(0);
          setLatestAnime([]);
        }
        setHasMore(unique.length >= 8);
      } else {
        setLatestAnime(prev => {
          const { merged, added } = mergeAnimeEntries(prev, data);
          setHasMore(added > 0 && data.length > 0);
          return merged;
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    fetchLatestEpisodes().then(setLatestEpisodes).catch(() => setLatestEpisodes([]));
  }, []);

  const goToSlide = useCallback((index: number, direction: 'next' | 'prev') => {
    setSlideDirection(direction);
    setHeroIndex(index);
  }, []);

  const goNext = useCallback(() => {
    if (featuredList.length <= 1) return;
    goToSlide((heroIndex + 1) % featuredList.length, 'next');
  }, [featuredList.length, heroIndex, goToSlide]);

  const goPrev = useCallback(() => {
    if (featuredList.length <= 1) return;
    goToSlide((heroIndex - 1 + featuredList.length) % featuredList.length, 'prev');
  }, [featuredList.length, heroIndex, goToSlide]);

  useEffect(() => {
    const onMouseUp = () => setIsHeroHolding(false);
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    if (featuredList.length <= 1) return;

    const clearSlideTimer = () => {
      if (slideTimerRef.current) {
        clearTimeout(slideTimerRef.current);
        slideTimerRef.current = null;
      }
    };

    if (lastHeroIndexRef.current !== heroIndex) {
      lastHeroIndexRef.current = heroIndex;
      slideDeadlineRef.current = Date.now() + HERO_INTERVAL_MS;
    }

    if (isHeroPaused) {
      clearSlideTimer();
      return clearSlideTimer;
    }

    const remaining = slideDeadlineRef.current - Date.now();

    if (remaining <= 0) {
      if (slideDeadlineRef.current === 0) {
        slideDeadlineRef.current = Date.now() + HERO_INTERVAL_MS;
        slideTimerRef.current = setTimeout(() => {
          setSlideDirection('next');
          setHeroIndex(prev => (prev + 1) % featuredList.length);
        }, HERO_INTERVAL_MS);
      } else {
        setSlideDirection('next');
        setHeroIndex(prev => (prev + 1) % featuredList.length);
      }
      return clearSlideTimer;
    }

    slideTimerRef.current = setTimeout(() => {
      setSlideDirection('next');
      setHeroIndex(prev => (prev + 1) % featuredList.length);
    }, remaining);

    return clearSlideTimer;
  }, [featuredList.length, heroIndex, isHeroPaused]);

  const heroAnime = featuredList.length > 0 ? featuredList[heroIndex] : null;
  const bgAnimClass = slideDirection === 'next' ? 'hero-bg-in-next' : 'hero-bg-in-prev';

  useEffect(() => {
    if (!heroAnime) {
      setHeroSynopsis(null);
      setHeroBackdrop(null);
      return;
    }

    let cancelled = false;
    const key = animeEntryKey(heroAnime);
    const cached = heroDetailCacheRef.current.get(key);

    if (cached) {
      setHeroSynopsis(cached.synopsis);
      setHeroBackdrop(cached.poster);
    } else {
      setHeroSynopsis(null);
      setHeroBackdrop(heroAnime.poster);
      fetchHeroDetail(heroAnime).then(detail => {
        if (!cancelled) {
          setHeroSynopsis(detail.synopsis);
          setHeroBackdrop(detail.poster);
        }
      });
    }

    featuredList.forEach((entry, i) => {
      if (i === heroIndex) return;
      const entryKey = animeEntryKey(entry);
      if (!heroDetailCacheRef.current.has(entryKey)) {
        fetchHeroDetail(entry);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [heroAnime, heroIndex, featuredList, fetchHeroDetail]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next, true);
  };

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* ─── Hero Banner ─── */}
      <section
        className="relative w-full h-[55vh] min-h-[420px] max-h-[580px] overflow-hidden bg-surface-container-highest group"
        onMouseEnter={() => setIsHeroHovering(true)}
        onMouseLeave={() => {
          setIsHeroHovering(false);
          setIsHeroHolding(false);
        }}
        onMouseDown={() => setIsHeroHolding(true)}
        onMouseUp={() => setIsHeroHolding(false)}
      >
        {heroAnime && (
          <>
            <div key={`bg-${heroIndex}`} className={`absolute inset-0 ${bgAnimClass}`}>
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={heroBackdrop || heroAnime.poster || ''}
                  alt=""
                  aria-hidden
                  className="hero-bg-image"
                />
              </div>
              <div className="absolute inset-0 bg-[#080B12]/25" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080B12]/95 via-[#080B12]/45 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080B12]/85 via-[#080B12]/15 to-transparent" />
              <div className="hero-bottom-fade" />
            </div>

            {featuredList.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  aria-label="Anterior"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 hover:border-primary/30 border border-white/10 transition-all duration-200 opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:!opacity-100 active:scale-95"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={goNext}
                  aria-label="Siguiente"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 hover:border-primary/30 border border-white/10 transition-all duration-200 opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:!opacity-100 active:scale-95"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div key={`content-${heroIndex}`} className="absolute bottom-0 left-0 p-10 w-full md:w-3/5 flex flex-col gap-4 hero-content-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary uppercase">
                  {PROVIDER_LABELS[heroAnime.provider] ?? heroAnime.provider}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/10 text-white/70 border border-white/10">
                  {heroAnime.type || 'TV'}
                </span>
              </div>

              <h1 className="text-5xl font-bold text-white leading-tight font-display drop-shadow-2xl">
                {heroAnime.title}
              </h1>

              <p className="text-white/75 text-sm leading-relaxed line-clamp-3 max-w-2xl drop-shadow-md min-h-[3.75rem]">
                {heroSynopsis === null ? (
                  <span className="inline-block h-4 w-64 max-w-full rounded bg-white/10 animate-pulse" />
                ) : heroSynopsis ? (
                  heroSynopsis
                ) : (
                  <span className="text-white/45 italic">Sin sinopsis disponible.</span>
                )}
              </p>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => onAnimeSelect?.(heroAnime.url, heroAnime.provider)}
                  className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-primary-glow active:scale-95"
                >
                  <Play size={20} fill="currentColor" />
                  Ver Detalles
                </button>
              </div>
            </div>

            <div key={`poster-${heroIndex}`} className="absolute right-12 bottom-12 w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10 hidden lg:block hero-poster-in">
              <img src={heroBackdrop || heroAnime.poster || ''} alt="Cover" className="w-full h-full object-cover" />
            </div>

            {featuredList.length > 1 && (
              <div className="absolute bottom-6 left-10 right-10 flex gap-2 z-20">
                {featuredList.map((item, i) => (
                  <button
                    key={`${item.provider}-${item.id}-${i}`}
                    onClick={() => goToSlide(i, i > heroIndex ? 'next' : 'prev')}
                    aria-label={`Ir a ${item.title}`}
                    className="relative flex-1 h-1 rounded-full bg-white/15 overflow-hidden hover:bg-white/25 transition-colors"
                  >
                    {i === heroIndex && (
                      <span
                        key={`progress-${heroIndex}`}
                        className={`absolute inset-0 rounded-full bg-primary hero-progress-bar${isHeroPaused ? ' hero-progress-paused' : ''}`}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── Últimos Episodios ─── */}
      {latestEpisodes.length > 0 && (
        <section className="px-8 flex flex-col gap-4 relative z-10 -mt-6">
          <h2 className="text-white font-semibold text-xl">Últimos Episodios</h2>
          <div className="grid grid-cols-5 gap-2.5">
            {latestEpisodes.slice(0, 20).map((ep, i) => (
              <div
                key={ep.id + '-' + i}
                onClick={() => onPlayEpisode?.(ep.url, ep.provider, { url: ep.url, title: ep.animeTitle, poster: ep.poster }, { number: ep.number, title: ep.title })}
                className="group relative rounded-lg overflow-hidden cursor-pointer border border-white/0 hover:border-primary/30 transition-all duration-300"
                style={{ background: '#181E28' }}
              >
                <div className="aspect-video overflow-hidden bg-white/5 relative">
                  <img
                    src={ep.poster}
                    alt={ep.animeTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-primary/90 text-[10px] text-white font-bold">
                    EP {ep.number}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center shadow-primary-glow">
                      <Play size={18} className="text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-2 flex flex-col gap-0.5">
                  <p className="text-white text-xs font-semibold line-clamp-1 leading-tight">{ep.animeTitle}</p>
                  <p className="text-muted text-[10px]">{ep.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Últimos Agregados ─── */}
      <section className="px-8 flex flex-col gap-5 relative z-10 -mt-10">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-semibold text-xl">Últimos Agregados</h2>
          <button
            onClick={onViewAll}
            className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium transition-colors"
          >
            Ver catálogo <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: INITIAL_COUNT }).map((_, i) => (
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
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {latestAnime.map((item, i) => (
                <div
                  key={`${item.provider}-${item.id}-${i}`}
                  onClick={() => onAnimeSelect?.(item.url, item.provider)}
                  className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/0 hover:border-primary/30 transition-all duration-300"
                  style={{ background: '#181E28' }}
                >
                  <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white/60 font-medium uppercase">
                    {PROVIDER_LABELS[item.provider] ?? item.provider}
                  </div>

                  <div className="h-52 overflow-hidden bg-white/5 relative">
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
                    <p className="text-muted text-[10px] uppercase font-medium mt-1">{item.type || 'Anime'}</p>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-card border border-white/8 hover:border-primary/30 rounded-xl text-sm text-muted hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  Ver más
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
