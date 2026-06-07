/**
 * AnimeFLV Extension for SakeAnime
 * Provider: https://www.animeflv.net
 * Language: ES (Spanish)
 */

const BASE_URL = 'https://www.animeflv.net';

// Helper: fetch HTML via Electron's IPC proxy (bypasses CORS)
async function fetchHTML(url: string): Promise<string> {
  const w = window as any;
  if (w.electronAPI?.fetch) {
    const result = await w.electronAPI.fetch(url);
    if (!result.ok) throw new Error(result.error || `Fetch failed (${result.status})`);
    if (result.type === 'json') return JSON.stringify(result.data);
    return result.data;
  }
  // Fallback for web mode (may hit CORS)
  const res = await fetch(url);
  return res.text();
}

// Fallback proxy API (Jimov) used when animeflv.net is unreachable
const JIMOV_API = 'https://jimov-api.vercel.app';
async function fetchViaJimov(path: string) {
  const w = window as any;
  const full = `${JIMOV_API}${path}`;
  if (w.electronAPI?.fetch) {
    const r = await w.electronAPI.fetch(full);
    if (!r.ok) throw new Error(r.error || `Jimov fetch failed (${r.status})`);
    return r.type === 'json' ? r.data : r.data;
  }
  const res = await fetch(full);
  if (!res.ok) throw new Error(`Jimov fetch failed (${res.status})`);
  return res.json();
}

// Helper: parse anime list items from HTML rows
function parseAnimeList(html: string) {
  const items: any[] = [];
  // Pattern matches article tags with anime info in AnimeFLV's structure
  const articleRegex = /<article[^>]*class="[^"]*Anime[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const matches = html.matchAll(articleRegex);

  for (const match of matches) {
    const block = match[1];

    const titleMatch = block.match(/<h3[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h3>/i);
    const hrefMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
    const imgMatch = block.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
    const typeMatch = block.match(/<span[^>]*class="[^"]*Type[^"]*"[^>]*>([^<]+)<\/span>/i);

    if (titleMatch && hrefMatch) {
      const url = hrefMatch[1].startsWith('http') ? hrefMatch[1] : BASE_URL + hrefMatch[1];
      const img = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '';

      items.push({
        id: hrefMatch[1].replace('/anime/', '').replace('/', ''),
        title: titleMatch[1].trim(),
        url,
        poster: img,
        type: typeMatch ? typeMatch[1].trim() : 'TV',
        provider: 'animeflv',
      });
    }
  }
  return items;
}

// Parse episodes from detail page
function parseEpisodes(html: string, animeUrl: string) {
  const episodes: any[] = [];
  const animeSlug = animeUrl.replace(BASE_URL + '/anime/', '').replace('/', '');

  // AnimeFLV stores episodes as JSON in a script tag: var episodes = [[N,N],...]
  const scriptMatch = html.match(/var\s+episodes\s*=\s*(\[\[.*?\]\])/s);
  if (scriptMatch) {
    try {
      const raw = JSON.parse(scriptMatch[1]) as number[][];
      raw.reverse().forEach(([num]) => {
        episodes.push({
          id: `${animeSlug}-${num}`,
          number: num,
          title: `Episodio ${num}`,
          url: `${BASE_URL}/ver/${animeSlug}-${num}`,
        });
      });
    } catch (_) {}
  }
  return episodes;
}

// Parse video sources from episode page
function parseVideoSources(html: string) {
  const sources: any[] = [];

  // AnimeFLV stores servers as JSON in a script tag: var videos = {...}
  const videosMatch = html.match(/var\s+videos\s*=\s*(\{.*?\});/s);
  if (videosMatch) {
    try {
      const videos = JSON.parse(videosMatch[1]);
      const subs = videos.SUB || [];
      subs.forEach((server: any) => {
        sources.push({
          server: server.title,
          url: server.url || server.code,
          type: 'sub',
        });
      });
    } catch (_) {}
  }
  return sources;
}

export const AnimeFLVProvider = {
  id: 'animeflv',
  name: 'AnimeFLV',
  version: '1.0.0',
  language: 'ES',
  type: 'anime' as const,
  logo: 'https://animeflv.net/favicon.ico',
  baseUrl: BASE_URL,

  async latest(page: number = 1) {
    try {
      const html = await fetchHTML(`${BASE_URL}/browse?order=added&page=${page}`);
      const parsed = parseAnimeList(html);
      // If parsing returned items, return them. Otherwise fall back to Jimov.
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      throw new Error('Empty parse result');
    } catch (err) {
      // Fallback to Jimov API
      const data: any = await fetchViaJimov(`/anime/tioanime/filter?page=${page}`);
      const list = Array.isArray(data) ? data : (data && data.results) || [];
      return list.map((item: any) => ({
        id: item.url || item.slug || item.id,
        title: item.name || item.title,
        url: item.url,
        poster: item.image || '',
        type: item.type || 'TV',
        provider: 'animeflv',
      }));
    }
  },

  async search(query: string, page: number = 1) {
    const q = encodeURIComponent(query);
    try {
      const html = await fetchHTML(`${BASE_URL}/browse?q=${q}&page=${page}`);
      const parsed = parseAnimeList(html);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      throw new Error('Empty parse result');
    } catch (err) {
      const data: any = await fetchViaJimov(`/anime/tioanime/filter?q=${q}&page=${page}`);
      const list = Array.isArray(data) ? data : (data && data.results) || [];
      return list.map((item: any) => ({
        id: item.url || item.slug || item.id,
        title: item.name || item.title,
        url: item.url,
        poster: item.image || '',
        type: item.type || 'TV',
        provider: 'animeflv',
      }));
    }
  },

  async detail(url: string) {
    try {
      const html = await fetchHTML(url);

      const titleMatch = html.match(/<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h1>/i);
      const synopsisMatch = html.match(/<div[^>]*class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const imgMatch = html.match(/<img[^>]*src="([^"]*cover[^"]*)"[^>]*>/i);
      const ratingMatch = html.match(/itemprop="ratingValue"[^>]*>([0-9.]+)</i);
      const statusMatch = html.match(/<span[^>]*>Estado<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);

      const genreMatches = [...html.matchAll(/<a[^>]*href="[^"]*genero[^"]*"[^>]*>([^<]+)<\/a>/gi)];
      const genres = genreMatches.map(m => m[1].trim());

      const episodes = parseEpisodes(html, url);

      const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
      // If parsing produced almost no useful data, fall back to Jimov
      if (title === 'Unknown' && episodes.length === 0) throw new Error('Empty detail parse');

      return {
        title,
        synopsis: synopsisMatch ? synopsisMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        poster: imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '',
        rating: ratingMatch ? ratingMatch[1] : '0',
        status: statusMatch ? statusMatch[1].trim() : 'Unknown',
        genres,
        episodes,
        episodeCount: episodes.length,
        url,
        provider: 'animeflv',
      };
    } catch (err) {
      // Try Jimov detail endpoint
      const data: any = await fetchViaJimov(`/anime/tioanime/detail?url=${encodeURIComponent(url)}`);
      if (!data) throw new Error('Detail fetch failed');
      return {
        title: data.name || data.title || 'Unknown',
        synopsis: data.synopsis || data.desc || '',
        poster: data.image || '',
        rating: data.rating || '0',
        status: data.status || 'Unknown',
        genres: data.genres || [],
        episodes: (data.episodes || []).map((ep: any) => ({ id: ep.url || ep.id, number: ep.number, title: `Episodio ${ep.number}`, url: ep.url })),
        episodeCount: (data.episodes || []).length,
        url,
        provider: 'animeflv',
      };
    }
  },

  async episodes(url: string) {
    const html = await fetchHTML(url);
    return parseEpisodes(html, url);
  },

  async watch(episodeUrl: string) {
    const html = await fetchHTML(episodeUrl);
    return parseVideoSources(html);
  },
};
