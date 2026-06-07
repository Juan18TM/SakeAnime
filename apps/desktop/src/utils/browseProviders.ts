import { extensionRegistry } from '../services/ExtensionRegistry';
import type { AnimeEntry } from '../services/ExtensionRegistry';

export const BROWSE_PROVIDER_IDS = ['tioanime', 'animefenix2'] as const;

export const PROVIDER_LABELS: Record<string, string> = {
  tioanime: 'TioAnime',
  animefenix2: 'AnimeFenix',
  jiruhub: 'JiruHub',
  animeflv: 'AnimeFLV',
};

export async function fetchFromBrowseProviders(
  fetcher: (id: string) => Promise<AnimeEntry[]>
): Promise<AnimeEntry[]> {
  const results = await Promise.allSettled(
    BROWSE_PROVIDER_IDS.map(id => fetcher(id))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<AnimeEntry[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

export async function fetchLatestFromBrowseProviders(page: number): Promise<AnimeEntry[]> {
  return fetchFromBrowseProviders(id => {
    const provider = extensionRegistry.getProvider(id);
    return provider ? provider.latest(page) : Promise.resolve([]);
  });
}
