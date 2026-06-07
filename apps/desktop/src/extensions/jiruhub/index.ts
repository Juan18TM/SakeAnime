/**
 * JiruHub / TioAnime provider (adapter of the user's JiruHub extension)
 * This provider uses the Jimov API as the extension did and exposes the
 * same methods expected by the app's ExtensionRegistry.
 */

const JIMOV = 'https://jimov-api.vercel.app';

async function get(url: string): Promise<any> {
  const api = (window as any).electronAPI;
  if (api?.fetch) {
    const r = await api.fetch(url.startsWith('http') ? url : `${JIMOV}${url}`);
    if (!r.ok) throw new Error(r.error || 'Fetch failed');
    return r.data as any;
  }
  const res = await fetch(url.startsWith('http') ? url : `${JIMOV}${url}`);
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
}

function refererFor(url: string) {
  if (!url) return 'https://tioanime.com/';
  if (url.includes('yourupload.com')) return 'https://www.yourupload.com/';
  if (url.includes('hqq.tv') || url.includes('netu')) return 'https://hqq.tv/';
  if (url.includes('ok.ru')) return 'https://ok.ru/';
  if (url.includes('streamsb') || url.includes('sbfull') || url.includes('sbplay')) return 'https://streamsb.com/';
  if (url.includes('fembed') || url.includes('anime789')) return 'https://www.fembed.com/';
  if (url.includes('mp4upload')) return 'https://www.mp4upload.com/';
  if (url.includes('streamtape')) return 'https://streamtape.com/';
  return 'https://tioanime.com/';
}

export const JiruHubProvider = {
  id: 'jiruhub',
  name: 'JiruHub (TioAnime)',
  version: '0.1.6',
  language: 'ES',
  type: 'anime' as const,
  baseUrl: JIMOV,

  async latest(page = 1) {
    const res = await get(`/anime/tioanime/filter?page=${page}`);
    const results = Array.isArray(res) ? res : ((res && res.results) || []);
    return results.map((item: any) => ({
      id: item.url,
      title: item.name,
      url: item.url,
      poster: item.image || '',
      type: item.type || 'TV',
      provider: 'jiruhub',
    }));
  },

  async search(query: string, page = 1) {
    const res = await get(`/anime/tioanime/filter?q=${encodeURIComponent(query)}&page=${page}`);
    const results = Array.isArray(res) ? res : ((res && res.results) || []);
    return results.map((item: any) => ({
      title: item.name,
      url: item.url,
      poster: item.image || '',
      desc: item.type || '',
      provider: 'jiruhub',
    }));
  },

  async detail(url: string) {
    const res = await get(url);
    if (!res) return { title: '', poster: '', synopsis: '', episodes: [] };
    const cover = res.image ? (res.image.url || res.image) : '';
    const episodes = (res.episodes || []).slice().reverse().map((ep: any) => ({
      id: ep.url,
      number: ep.number,
      title: `Ep ${ep.number}`,
      url: ep.url,
    }));
    return {
      title: res.name || '',
      synopsis: res.synopsis || '',
      poster: cover,
      rating: res.rating || '0',
      status: res.status || null,
      genres: res.genres || [],
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'jiruhub',
    };
  },

  async episodes(url: string) {
    const d = await this.detail(url);
    return d.episodes || [];
  },

  async watch(url: string) {
    // If the URL looks like a direct embed, return it directly
    if (url.includes('http://') || url.includes('https://')) {
      try {
        const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
        return [{ server: domain, url, type: 'embed' }];
      } catch (_) {}
    }

    const servers = await get(url);
    const list = Array.isArray(servers) ? servers : [];
    const sources: any[] = [];
    for (const s of list) {
      if (s && s.name && s.url) {
        sources.push({ server: s.name, url: s.url, type: 'embed', headers: { Referer: refererFor(s.url) } });
      }
    }
    return sources;
  },
};

export default JiruHubProvider;
