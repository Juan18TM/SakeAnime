/**
 * TioAnimeNew Extension for SakeAnime — v2.0
 * Provider: https://tioanime.com
 * Language: ES (Spanish)
 */

const BASE_URL = 'https://tioanime.com';

// ─── HTTP helper
async function fetchHTML(url: string): Promise<string> {
  const w = window as any;
  if (w.electronAPI?.fetch) {
    const result = await w.electronAPI.fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: BASE_URL,
      },
    });
    if (!result.ok) throw new Error(result.error ?? `HTTP error: ${url}`);
    return result.data;
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: BASE_URL } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// ─── Helpers
function extractScriptBlock(html: string, containing: string): string {
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1].includes(containing)) return m[1];
  }
  return '';
}

function toAbsURL(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : BASE_URL + path;
}

// ─── Parsers
function parseAnimeCards(html: string) {
  const items: any[] = [];
  const seen = new Set<string>();
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  for (const li of html.matchAll(liRegex)) {
    const block = li[1];
    const hrefMatch = block.match(/href="(\/anime\/[^"]+)"/i);
    if (!hrefMatch) continue;
    const path = hrefMatch[1].replace(/\/$/, '');
    if (seen.has(path)) continue;
    seen.add(path);
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) || block.match(/alt="([^"]+)"/i);
    const imgMatch = block.match(/<img[^>]*(?:src|data-src)="([^"]+)"/i);
    const typeMatch = block.match(/<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i);
    if (!titleMatch) continue;
    items.push({
      id: path.replace('/anime/', ''),
      title: titleMatch[1].trim(),
      url: BASE_URL + path,
      poster: toAbsURL(imgMatch?.[1] ?? ''),
      type: typeMatch ? typeMatch[1].trim() : 'TV',
      provider: 'tioanime',
    });
  }
  return items;
}

function parseEpisodes(html: string, animeSlug: string) {
  const episodes: any[] = [];
  const script = extractScriptBlock(html, 'var episodes');
  const match = script.match(/var\s+episodes\s*=\s*(\[[\s\S]*?\]);/);
  if (match) {
    try {
      const raw: [number, number][] = JSON.parse(match[1]);
      for (const [num] of raw) {
        episodes.push({ id: `${animeSlug}-${num}`, number: num, title: `Episodio ${num}`, url: `${BASE_URL}/ver/${animeSlug}-${num}` });
      }
      return episodes.sort((a, b) => a.number - b.number);
    } catch {}
  }
  const epRegex = new RegExp(`href="(\/ver\/${animeSlug}-(\\d+))"`, 'gi');
  const seen = new Set<number>();
  for (const m of html.matchAll(epRegex)) {
    const num = parseInt((m as any)[2]);
    if (seen.has(num)) continue;
    seen.add(num);
    episodes.push({ id: `${animeSlug}-${num}`, number: num, title: `Episodio ${num}`, url: BASE_URL + (m as any)[1] });
  }
  return episodes.sort((a, b) => a.number - b.number);
}

function parseVideoSources(html: string): any[] {
  const sources: any[] = [];
  const script = extractScriptBlock(html, 'var videos');
  const match = script.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
  if (match) {
    try {
      const raw: [string, string][] = JSON.parse(match[1]);
      for (const [server, url] of raw) {
        if (url) sources.push({ server, url, type: 'sub' });
      }
      if (sources.length > 0) return sources;
    } catch {}
  }
  const directRegex = /(?:file|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)/gi;
  for (const m of html.matchAll(directRegex)) {
    sources.push({ server: 'Direct', url: (m as any)[1], type: 'sub' });
  }
  const iframeRegex = /<iframe[^>]+src="([^"]+)"[^>]*>/gi;
  for (const m of html.matchAll(iframeRegex)) {
    const src = m[1];
    if (src.includes('streamtape') || src.includes('mp4upload') || src.includes('doodstream') || src.includes('streamlare') || src.includes('okru') || src.includes('mega')) {
      sources.push({ server: 'Embed', url: src, type: 'sub' });
    }
  }
  return sources;
}

export const TioAnimeNewProvider = {
  id: 'tioanimenew',
  name: 'TioAnimeNew',
  version: '2.0.0',
  language: 'ES',
  type: 'anime' as const,
  logo: 'https://tioanime.com/favicon.ico',
  baseUrl: BASE_URL,

  async latest(page: number = 1) {
    const html = await fetchHTML(`${BASE_URL}/directorio?p=${page}&order=added`);
    return parseAnimeCards(html);
  },

  async search(query: string, page: number = 1) {
    const q = encodeURIComponent(query);
    const html = await fetchHTML(`${BASE_URL}/directorio?q=${q}&p=${page}`);
    return parseAnimeCards(html);
  },

  async detail(url: string) {
    const html = await fetchHTML(url);
    const slug = url.replace(BASE_URL + '/anime/', '').replace(/\/$/, '');
    const titleMatch = html.match(/<h1[^>]*class="[^\"]*title[^\"]*"[^>]*>([^<]+)<\/h1>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const synopsisMatch = html.match(/<p[^>]*class="[^\"]*sinopsis[^\"]*"[^>]*>([\s\S]*?)<\/p>/i) || html.match(/<div[^>]*class="[^\"]*info[^\"]*"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
    const imgMatch = html.match(/<img[^>]*class="[^\"]*cover[^\"]*"[^>]*src="([^"]+)"/i) || html.match(/<img[^>]*src="([^\"]*portadas[^\"]*)"/i) || html.match(/<img[^>]*src="([^\"]*uploads[^\"]*\.(jpg|png|webp))"/i);
    const ratingMatch = html.match(/itemprop="ratingValue"[^>]*>([0-9.]+)/i);
    const genreMatches = [...html.matchAll(/<a[^>]*href="[^"]*genero[^"]*"[^>]*>([^<]+)<\/a>/gi)];
    const genres = genreMatches.map(m => m[1].trim());
    const episodes = parseEpisodes(html, slug);
    return {
      title: titleMatch ? titleMatch[1].trim() : slug,
      synopsis: synopsisMatch ? synopsisMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      poster: toAbsURL(imgMatch?.[1] ?? ''),
      rating: ratingMatch ? ratingMatch[1] : '0',
      genres,
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'tioanime',
    };
  },

  async episodes(animeUrl: string) {
    const html = await fetchHTML(animeUrl);
    const slug = animeUrl.replace(BASE_URL + '/anime/', '').replace(/\/$/, '');
    return parseEpisodes(html, slug);
  },

  async watch(episodeUrl: string) {
    const html = await fetchHTML(episodeUrl);
    return parseVideoSources(html);
  },
};
