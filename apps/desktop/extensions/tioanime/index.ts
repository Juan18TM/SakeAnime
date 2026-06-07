/**
 * TioAnime Extension for SakeAnime
 * Provider: https://tioanime.com
 * Language: ES (Spanish)
 */

const BASE_URL = 'https://tioanime.com';

async function fetchHTML(url: string): Promise<string> {
  const w = window as any;
  if (w.electronAPI?.fetch) {
    const result = await w.electronAPI.fetch(url);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }
  const res = await fetch(url);
  return res.text();
}

function parseAnimeCards(html: string) {
  const items: any[] = [];
  const cardRegex = /<article[^>]*class="[^"]*anime[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;

  for (const match of html.matchAll(cardRegex)) {
    const block = match[1];
    const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const hrefMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
    const imgMatch = block.match(/<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i);
    const typeMatch = block.match(/<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i);

    if (titleMatch && hrefMatch) {
      const url = hrefMatch[1].startsWith('http') ? hrefMatch[1] : BASE_URL + hrefMatch[1];
      const poster = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '';

      items.push({
        id: hrefMatch[1].replace('/anime/', '').replace('/', ''),
        title: titleMatch[1].trim(),
        url,
        poster,
        type: typeMatch ? typeMatch[1].trim() : 'TV',
        provider: 'tioanime',
      });
    }
  }
  return items;
}

function parseEpisodes(html: string, animeUrl: string) {
  const episodes: any[] = [];
  const slug = animeUrl.replace(BASE_URL + '/anime/', '').replace(/\/$/, '');

  // TioAnime typically lists episodes in li elements
  const epRegex = /<a[^>]*href="([^"]*ver[^"]*)"[^>]*>[\s\S]*?[Ee]pisodio?\s*(\d+)[\s\S]*?<\/a>/gi;
  let i = 0;
  for (const match of html.matchAll(epRegex)) {
    const url = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
    const num = parseInt(match[2]);
    episodes.push({
      id: `${slug}-${num}`,
      number: num,
      title: `Episodio ${num}`,
      url,
    });
    if (++i > 500) break;
  }
  return episodes.sort((a, b) => a.number - b.number);
}

export const TioAnimeProvider = {
  id: 'tioanime',
  name: 'TioAnime',
  version: '1.0.0',
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

    const titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const synopsisMatch = html.match(/<p[^>]*class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    const imgMatch = html.match(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i);
    const ratingMatch = html.match(/itemprop="ratingValue"[^>]*>([0-9.]+)/i);

    const genreMatches = [...html.matchAll(/<a[^>]*href="[^"]*genero[^"]*"[^>]*>([^<]+)<\/a>/gi)];
    const genres = genreMatches.map(m => m[1].trim());
    const episodes = parseEpisodes(html, url);

    return {
      title: titleMatch ? titleMatch[1].trim() : 'Unknown',
      synopsis: synopsisMatch ? synopsisMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      poster: imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '',
      rating: ratingMatch ? ratingMatch[1] : '0',
      genres,
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'tioanime',
    };
  },

  async episodes(url: string) {
    const html = await fetchHTML(url);
    return parseEpisodes(html, url);
  },

  async watch(episodeUrl: string) {
    const html = await fetchHTML(episodeUrl);
    const sourceRegex = /(?:file|src):\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)/gi;
    const sources: any[] = [];
    for (const m of html.matchAll(sourceRegex)) {
      sources.push({ server: 'Direct', url: m[1], type: 'sub' });
    }
    return sources;
  },
};
