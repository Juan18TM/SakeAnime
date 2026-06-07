import React, { useState, useEffect, useMemo } from 'react';
import { Play, ArrowLeft, Star, Clock, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { extensionRegistry } from '../services/ExtensionRegistry';
import type { AnimeDetail } from '../services/ExtensionRegistry';
import { getAdjacentSeasons, resolveProviderForUrl } from '../utils/seasonUtils';
import { PROVIDER_LABELS } from '../utils/browseProviders';

interface AnimeDetailPageProps {
  url: string;
  providerId: string;
  onBack: () => void;
  onPlayEpisode: (episodeUrl: string, providerId: string) => void;
  onNavigateAnime?: (url: string, providerId: string) => void;
}

export const AnimeDetailPage: React.FC<AnimeDetailPageProps> = ({
  url,
  providerId,
  onBack,
  onPlayEpisode,
  onNavigateAnime,
}) => {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const provider = extensionRegistry.getProvider(providerId);
        if (!provider) throw new Error('Proveedor no encontrado');

        const data = await provider.detail(url);
        setDetail(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar detalles');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [url, providerId]);

  const seasons = useMemo(() => {
    if (!detail) return { previous: undefined, next: undefined, all: [] };
    return getAdjacentSeasons(detail.title, detail.url, detail.relatedSeasons ?? []);
  }, [detail]);

  const navigateToSeason = (targetUrl: string) => {
    const targetProvider = resolveProviderForUrl(targetUrl, providerId);
    onNavigateAnime?.(targetUrl, targetProvider);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-muted">Cargando detalles del anime...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <p className="text-white font-medium">No se pudieron cargar los detalles</p>
        <p className="text-muted text-sm">{error}</p>
        <button onClick={onBack} className="mt-4 px-6 py-2 bg-card rounded-xl text-white hover:bg-white/5 transition-colors">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-12">
      <div className="relative w-full h-[45vh] min-h-[300px] overflow-hidden bg-surface-container-highest">
        <button
          onClick={onBack}
          className="absolute top-6 left-8 z-20 p-3 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>

        <img
          src={detail.poster}
          alt={detail.title}
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="px-8 -mt-32 relative z-10 flex flex-col md:flex-row gap-8">
        <div className="w-48 shrink-0 flex flex-col gap-4">
          <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-card">
            <img src={detail.poster} alt={detail.title} className="w-full h-full object-cover" />
          </div>
          <button
            onClick={() => detail.episodes.length > 0 && onPlayEpisode(detail.episodes[0].url, providerId)}
            disabled={detail.episodes.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold shadow-primary-glow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} fill="currentColor" />
            Ver primer episodio
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6 pt-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                {PROVIDER_LABELS[detail.provider] ?? detail.provider}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/80">
                {detail.status || 'Desconocido'}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white font-display leading-tight">{detail.title}</h1>
            <div className="flex items-center gap-4 text-sm font-medium mt-1">
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Star size={16} fill="currentColor" />
                <span>{detail.rating}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted">
                <Clock size={16} />
                <span>{detail.episodeCount} episodios</span>
              </div>
            </div>
          </div>

          {/* Navegación entre temporadas */}
          {(seasons.previous || seasons.next) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {seasons.previous ? (
                <button
                  onClick={() => navigateToSeason(seasons.previous!.url)}
                  className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-card border border-white/8 hover:border-primary/40 hover:bg-white/5 transition-all text-left group"
                >
                  <ChevronLeft size={20} className="text-primary shrink-0" />
                  <div className="flex items-center gap-3 min-w-0">
                    {seasons.previous.poster && (
                      <img
                        src={seasons.previous.poster}
                        alt=""
                        className="w-10 h-14 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-primary font-bold uppercase">Temporada anterior</p>
                      <p className="text-sm text-white font-medium truncate">{seasons.previous.title}</p>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="flex-1 hidden sm:block" />
              )}

              {seasons.next ? (
                <button
                  onClick={() => navigateToSeason(seasons.next!.url)}
                  className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-card border border-white/8 hover:border-primary/40 hover:bg-white/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                    <div className="min-w-0 text-right">
                      <p className="text-[10px] text-primary font-bold uppercase">Temporada siguiente</p>
                      <p className="text-sm text-white font-medium truncate">{seasons.next.title}</p>
                    </div>
                    {seasons.next.poster && (
                      <img
                        src={seasons.next.poster}
                        alt=""
                        className="w-10 h-14 object-cover rounded-lg shrink-0"
                      />
                    )}
                  </div>
                  <ChevronRight size={20} className="text-primary shrink-0" />
                </button>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {detail.genres.map(g => (
              <span key={g} className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 bg-card text-muted">
                {g}
              </span>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Sinopsis</h3>
            <p className="text-white/70 text-sm leading-relaxed max-w-4xl">
              {detail.synopsis || 'Sin sinopsis disponible para este título.'}
            </p>
          </div>

          {/* Lista de temporadas relacionadas */}
          {(detail.relatedSeasons?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Temporadas</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {seasons.all.map(season => {
                  const isCurrent = season.url === detail.url;
                  return (
                    <button
                      key={season.url}
                      onClick={() => !isCurrent && navigateToSeason(season.url)}
                      disabled={isCurrent}
                      className={`flex flex-col gap-2 shrink-0 w-28 rounded-xl overflow-hidden border transition-all ${
                        isCurrent
                          ? 'border-primary/60 ring-1 ring-primary/30 opacity-100'
                          : 'border-white/8 hover:border-primary/40 active:scale-95'
                      }`}
                      style={{ background: '#181E28' }}
                    >
                      <div className="h-36 bg-white/5 overflow-hidden">
                        {(season.poster || detail.poster) ? (
                          <img
                            src={season.poster || detail.poster}
                            alt={season.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted text-[10px] p-2 text-center">
                            {season.title}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-white font-medium line-clamp-2 px-2 pb-2 leading-tight">
                        {season.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Episodios</h3>
              <span className="text-xs text-muted font-medium">{detail.episodes.length} en total</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {detail.episodes.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => onPlayEpisode(ep.url, providerId)}
                  className="group flex items-center justify-between p-4 rounded-xl bg-card border border-white/5 hover:border-primary/40 hover:bg-white/5 transition-all text-left"
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-xs text-primary font-bold">EP {ep.number}</span>
                    <span className="text-sm text-white font-medium truncate">{ep.title}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-primary flex items-center justify-center shrink-0 transition-colors">
                    <Play size={14} className="text-white ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
