/**
 * Extension Registry
 * Centralizes all installed providers and exposes them to the app.
 */
import { AnimeFLVProvider } from '../extensions/animeflv/index';
import { TioAnimeProvider } from '../extensions/tioanime/index';
import { TioAnimeNewProvider } from '../extensions/tioanimenew/index';
import { JiruHubProvider } from '../extensions/jiruhub/index';
import { AnimeFenix2Provider } from '../extensions/animefenix2/index';

export type AnimeEntry = {
  id: string;
  title: string;
  url: string;
  poster: string;
  type: string;
  provider: string;
};

export type AnimeDetail = {
  title: string;
  synopsis: string;
  poster: string;
  rating: string;
  status?: string;
  genres: string[];
  episodes: Episode[];
  episodeCount: number;
  url: string;
  provider: string;
};

export type Episode = {
  id: string;
  number: number;
  title: string;
  url: string;
};

export type VideoSource = {
  server: string;
  url: string;
  type: string;
};

export interface AnimeProvider {
  id: string;
  name: string;
  version: string;
  language: string;
  type: 'anime' | 'manga';
  logo?: string;
  baseUrl?: string;
  latest(page: number): Promise<AnimeEntry[]>;
  search(query: string, page: number): Promise<AnimeEntry[]>;
  detail(url: string): Promise<AnimeDetail>;
  episodes(url: string): Promise<Episode[]>;
  watch(url: string): Promise<VideoSource[]>;
}

// Registry of all available providers
  const PROVIDERS: Record<string, AnimeProvider> = {
    animeflv: AnimeFLVProvider as AnimeProvider,
    tioanime: TioAnimeProvider as AnimeProvider,
    tioanimenew: TioAnimeNewProvider as AnimeProvider,
    animefenix2: AnimeFenix2Provider as AnimeProvider,
    jiruhub: JiruHubProvider as unknown as AnimeProvider,
  // Only include the main providers. Other adapters were removed per request.
  // Additional JiruHub adapters (copied minimal implementations)
  // These adapters are thin wrappers that expose Jimov API-backed sources.
  // They are loaded from the local extensions folder when present.
  // Note: we don't import the JS extension classes directly; instead the
  // JiruHubProvider above already uses the Jimov API and provides the same
  // data. Keep entries here for discoverability in the UI.
};

export class ExtensionRegistry {
  private activeProviders: Set<string>;

  constructor(activeIds: string[] = ['jiruhub', 'tioanime', 'animefenix2']) {
    // By default prefer JiruHub (jimov API) and TioAnime to avoid direct
    // scraping of animeflv.net which often fails in restricted networks.
    this.activeProviders = new Set(activeIds);
  }

  getAllProviders(): AnimeProvider[] {
    return Object.values(PROVIDERS);
  }

  getActiveProviders(): AnimeProvider[] {
    return Object.values(PROVIDERS).filter(p => this.activeProviders.has(p.id));
  }

  getProvider(id: string): AnimeProvider | null {
    return PROVIDERS[id] || null;
  }

  activate(id: string) {
    this.activeProviders.add(id);
  }

  deactivate(id: string) {
    this.activeProviders.delete(id);
  }

  // Fetch latest anime across all active providers in parallel
  async latestAll(page: number = 1): Promise<AnimeEntry[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(p => p.latest(page))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<AnimeEntry[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
  }

  // Search across all active providers in parallel
  async searchAll(query: string, page: number = 1): Promise<AnimeEntry[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(p => p.search(query, page))
    );
    const items = results
      .filter((r): r is PromiseFulfilledResult<AnimeEntry[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    return items;
  }
}

// Singleton instance
export const extensionRegistry = new ExtensionRegistry();
