/**
 * AnimeFLV Extension for SakeAnime
 * Provider: https://www4.animeflv.net
 * Language: ES (Spanish)
 */

const BASE_URL = 'https://www4.animeflv.net';

async function fetchHTML(url: string): Promise<string> {
  const w = window as any;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116 Safari/537.36'
  };
  if (w.electronAPI?.fetch) {
    const result = await w.electronAPI.fetch(url, headers);
    if (!result.ok) throw new Error(result.error || `HTTP ${result.status}`);
    return result.data as string;
  }
  const res = await fetch(url, { headers } as any);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Parsea las tarjetas de anime del directorio/búsqueda.
 */
function parseAnimeCards(html: string) {
  const items: any[] = [];
  const cardRegex = /<article[^>]*class="[^"]*Anime[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  for (const match of html.matchAll(cardRegex)) {
    const block = match[1];
    const titleMatch = block.match(/<h3[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h3>/i);
    const hrefMatch = block.match(/<a[^>]*href="(\/anime\/[^\"]+)"[^>]*>/i);
    const imgMatch = block.match(/<img[^>]*src="([^\"]+)"[^>]*>/i);
    const typeMatch = block.match(/<span[^>]*class="[^"]*Type[^"]*"[^>]*>([^<]+)<\/span>/i);
    if (titleMatch && hrefMatch) {
      const path = hrefMatch[1];
      const url = BASE_URL + path;
      const poster = imgMatch
        ? imgMatch[1].startsWith('http')
          ? imgMatch[1]
          : BASE_URL + imgMatch[1]
        : '';
      items.push({
        id: path.replace('/anime/', '').replace(/\/$/, ''),
        title: titleMatch[1].trim(),
        url,
        poster,
        type: typeMatch ? typeMatch[1].trim() : 'Anime',
        provider: 'animeflv',
      });
    }
  }
  return items;
}

function parseEpisodes(html: string, animeSlug: string) {
  const episodes: any[] = [];
  const jsArrayMatch = html.match(/var\s+episodes\s*=\s*(\[\[[\s\S]*?\]\])/);
  if (jsArrayMatch) {
    try {
      const raw: [number, number][] = JSON.parse(jsArrayMatch[1]);
      for (const [num] of raw) {
        const epUrl = `${BASE_URL}/ver/${animeSlug}-${num}`;
        episodes.push({ id: `${animeSlug}-${num}`, number: num, title: `Episodio ${num}`, url: epUrl });
      }
      return episodes.sort((a, b) => a.number - b.number);
    } catch {}
  }
  const epRegex = new RegExp(`href="(\\/ver\\/${animeSlug}-(\\d+))"`, 'gi');
  const seen = new Set<number>();
  for (const m of html.matchAll(epRegex)) {
    const num = parseInt((m as any)[2]);
    if (seen.has(num)) continue;
    seen.add(num);
    episodes.push({ id: `${animeSlug}-${num}`, number: num, title: `Episodio ${num}`, url: BASE_URL + (m as any)[1] });
  }
  return episodes.sort((a, b) => a.number - b.number);
}

function parseVideoSources(html: string) {
  const sources: any[] = [];
  const videosMatch = html.match(/var\s+videos\s*=\s*(\{[\s\S]*?\});/);
  if (videosMatch) {
    try {
      const videosObj: Record<string, any[]> = JSON.parse(videosMatch[1]);
      for (const servers of Object.values(videosObj)) {
        for (const entry of servers) {
          const [server, url, code] = entry as any[];
          if (url) sources.push({ server, url, code: code || '', type: 'embed' });
        }
      }
      if (sources.length > 0) return sources;
    } catch {}
  }
  const directRegex = /(?:file|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  for (const m of html.matchAll(directRegex)) {
    sources.push({ server: 'Direct', url: (m as any)[1], type: 'direct' });
  }
  const iframeRegex = /<iframe[^>]+src="([^\"]+)"[^>]*>/gi;
  for (const m of html.matchAll(iframeRegex)) {
    const src = (m as any)[1];
    if (!src.includes('facebook') && !src.includes('disqus')) {
      sources.push({ server: 'Embed', url: src, type: 'embed' });
    }
  }
  return sources;
}

export const AnimeFLVProvider = {
  id: 'animeflv',
  name: 'AnimeFLV',
  version: '1.0.0',
  language: 'ES',
  type: 'anime' as const,
  logo: 'https://www4.animeflv.net/favicon.ico',
  baseUrl: BASE_URL,

  async latest(page: number = 1) {
    const html = await fetchHTML(`${BASE_URL}/browse?order=added&page=${page}`);
    return parseAnimeCards(html);
  },

  async search(query: string, page: number = 1) {
    const q = encodeURIComponent(query);
    const html = await fetchHTML(`${BASE_URL}/browse?q=${q}&page=${page}`);
    return parseAnimeCards(html);
  },

  async detail(url: string) {
    const html = await fetchHTML(url);
    const slug = url.replace(BASE_URL + '/anime/', '').replace(/\/$/, '');
    const titleMatch = html.match(/<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const synopsisMatch = html.match(/<div[^>]*class="[^"]*Description[^"]*"[^>]*>\s*<p>([\s\S]*?)<\/p>/i);
    const imgMatch = html.match(/<img[^>]*src="([^"']+\/covers\/[^"']+)"[^>]*>/i);
    const ratingMatch = html.match(/class="[^"']*fa-star[^"']*"[\s\S]*?<span[^>]*>([0-9.]+)<\/span>/i);
    const statusMatch = html.match(/<span[^>]*class="[^"]*Status[^"]*"[^>]*>([^<]+)<\/span>/i);
    const typeMatch = html.match(/<span[^>]*class="[^"]*Type[^"]*"[^>]*>([^<]+)<\/span>/i);
    const genreMatches = [...html.matchAll(/<a[^>]*href="[^"]*browse\?genre=[^"]*"[^>]*>([^<]+)<\/a>/gi)];
    const genres = genreMatches.map(m => (m as any)[1].trim());
    const episodes = parseEpisodes(html, slug);
    return {
      title: titleMatch ? (titleMatch[1].trim()) : 'Unknown',
      synopsis: synopsisMatch ? synopsisMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      poster: imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '',
      rating: ratingMatch ? ratingMatch[1] : '0',
      status: statusMatch ? statusMatch[1].trim() : '',
      type: typeMatch ? typeMatch[1].trim() : 'Anime',
      genres,
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'animeflv',
    };
  },

  async episodes(animeUrl: string) {
    const html = await fetchHTML(animeUrl);
    const slug = animeUrl.replace(BASE_URL + '/anime/', '').replace(/\/$/, '');
    return parseEpisodes(html, slug);
  },

  async watch(episodeUrl: string) {
    // Return only preferred servers — YourUpload and StreamWish/FileLions ("sw").
    // Many AnimeFLV pages list servers under various short names (e.g. 'SW').
    const html = await fetchHTML(episodeUrl);
    const all = parseVideoSources(html);
    const filtered = all.filter((s: any) => {
      const url = (s.url || '').toLowerCase();
      const server = (s.server || '').toLowerCase();
      // match YourUpload
      if (url.includes('yourupload') || server.includes('yourupload')) return true;
      // match StreamWish / FileLions / SW / swish variants
      if (server === 'sw' || server === 'swish' || server.includes('streamwish') || server.includes('filelions')) return true;
      if (url.includes('streamwish') || url.includes('filelions')) return true;
      return false;
    });
    // Normalize names: prefer friendly server names for the UI
    return filtered.map((s: any) => {
      let serverName = s.server || '';
      const sn = serverName.toLowerCase();
      if (sn === 'sw' || sn.includes('streamwish') || sn.includes('swish')) serverName = 'StreamWish';
      if (sn.includes('filelions')) serverName = 'FileLions';
      if (sn.includes('yourupload')) serverName = 'YourUpload';
      return { server: serverName, url: s.url, type: s.type || 'embed' };
    });
  },
};
