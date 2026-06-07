/**
 * TioAnime Provider
 * Source: https://tioanime.com
 * Language: Spanish (ES)
 */

import { getGenreById } from '../../constants/animeGenres';
import { parseTioAnimeCronologia } from '../../utils/seasonUtils';

const BASE = 'https://tioanime.com';

// Decode HTML entities like &oacute; -> ó
function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/g, 'ü').replace(/&Uuml;/g, 'Ü')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function get(url: string): Promise<string> {
  const api = (window as any).electronAPI;
  if (api?.fetch) {
    const r = await api.fetch(url);
    if (!r.ok) throw new Error(r.error || 'Fetch failed');
    return r.data as string;
  }
  // Web fallback — try multiple proxies
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      if (res.ok) return res.text();
    } catch (_) {}
  }
  throw new Error('All proxies failed');
}

function parseCards(html: string) {
  const results: any[] = [];
  let m: RegExpExecArray | null;
  // TioAnime uses <article class="anime ...">
  const re = /<article[^>]*class="[^"]*anime[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  while ((m = re.exec(html)) !== null) {
    const block = m[1];
    const title = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block);
    const href = /<a[^>]*href="(\/anime\/[^"]+)"[^>]*>/i.exec(block);
    const img = /<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>/i.exec(block);
    const type = /<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i.exec(block);
    if (title && href) {
      results.push({
        id: href[1].replace('/anime/', ''),
        title: decodeHtml(title[1].replace(/<[^>]+>/g, '').trim()),
        url: BASE + href[1],
        poster: img ? (img[1].startsWith('http') ? img[1] : BASE + img[1]) : '',
        type: type ? decodeHtml(type[1].trim()) : 'TV',
        provider: 'tioanime',
      });
    }
  }
  return results;
}

export const TioAnimeProvider = {
  id: 'tioanime',
  name: 'TioAnime',
  version: '1.0.0',
  language: 'ES',
  type: 'anime' as const,
  baseUrl: BASE,

  async latest(page = 1) {
    const html = await get(`${BASE}/directorio?p=${page}&order=added`);
    return parseCards(html);
  },

  async search(query: string, page = 1) {
    const html = await get(`${BASE}/directorio?q=${encodeURIComponent(query)}&p=${page}`);
    return parseCards(html);
  },

  async browseByGenre(genreId: string, page = 1) {
    const genre = getGenreById(genreId);
    if (!genre) return [];
    const html = await get(`${BASE}/directorio?${genre.tioanime}&p=${page}`);
    return parseCards(html);
  },

  async detail(url: string) {
    const html = await get(url);

    // Title: <h1 class="title">...</h1>
    const title = /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    // Synopsis: <p class="sinopsis">...</p> OR <div class="sinopsis"><p>...</p>
    const synopsis = /<p[^>]*class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(html)
      || /<div[^>]*class="[^"]*sinopsis[^"]*"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i.exec(html);
    // Poster image
    const img = /<img[^>]*(?:data-src|src)="([^"]+)"[^>]*class="[^"]*cover[^"]*"/i.exec(html)
      || /<img[^>]*class="[^"]*cover[^"]*"[^>]*(?:data-src|src)="([^"]+)"/i.exec(html)
      || /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i.exec(html);
    // Rating
    const rating = /itemprop="ratingValue"[^>]*>([0-9.]+)/i.exec(html);
    // Status
    const status = /<span[^>]*class="[^"]*status[^"]*"[^>]*>([^<]+)<\/span>/i.exec(html);

    const genres: string[] = [];
    let gm: RegExpExecArray | null;
    const gre = /<a[^>]*href="[^"]*genero[^"]*"[^>]*>([^<]+)<\/a>/gi;
    while ((gm = gre.exec(html)) !== null) genres.push(decodeHtml(gm[1].trim()));

    const episodes = this.parseEpisodes(html, url);
    const relatedSeasons = parseTioAnimeCronologia(html, BASE);

    return {
      title: title ? decodeHtml(title[1].replace(/<[^>]+>/g, '').trim()) : 'Unknown',
      synopsis: synopsis ? decodeHtml(synopsis[1].replace(/<[^>]+>/g, '').trim()) : '',
      poster: img ? (img[1].startsWith('http') ? img[1] : BASE + img[1]) : '',
      rating: rating ? rating[1] : '0',
      status: status ? decodeHtml(status[1].trim()) : null,
      genres,
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'tioanime',
      relatedSeasons,
    };
  },

  parseEpisodes(html: string, animeUrl: string) {
    const slug = animeUrl.replace(BASE + '/anime/', '').replace(/\/$/, '');
    const episodes: any[] = [];
    const seen = new Set<string>();

    // TioAnime stores episodes in: var episodes = [[num, ...], ...] or similar JSON
    // Try to find the episodes array in a <script> tag
    const scriptMatch = /var\s+episodes\s*=\s*(\[[\s\S]*?\]);/i.exec(html);
    if (scriptMatch) {
      try {
        const raw = JSON.parse(scriptMatch[1]);
        if (Array.isArray(raw)) {
          raw.forEach((item: any) => {
            const num = Array.isArray(item) ? item[0] : item;
            const epUrl = `${BASE}/ver/${slug}-${num}`;
            if (!seen.has(epUrl)) {
              seen.add(epUrl);
              episodes.push({ id: `${slug}-${num}`, number: num, title: `Episodio ${num}`, url: epUrl });
            }
          });
          return episodes.sort((a, b) => a.number - b.number);
        }
      } catch (_) {}
    }

    // Fallback: scrape <a href="/ver/..."> links
    let m: RegExpExecArray | null;
    const re = /<a[^>]*href="(\/ver\/[^"]+)"[^>]*>/gi;
    while ((m = re.exec(html)) !== null) {
      const epUrl = BASE + m[1];
      if (!seen.has(epUrl)) {
        seen.add(epUrl);
        const numMatch = /(\d+)(?:-\d+)?$/.exec(m[1]);
        const num = numMatch ? parseInt(numMatch[1]) : episodes.length + 1;
        episodes.push({ id: `${slug}-${num}`, number: num, title: `Episodio ${num}`, url: epUrl });
      }
    }
    return episodes.sort((a, b) => a.number - b.number);
  },

  async episodes(url: string) {
    const html = await get(url);
    return this.parseEpisodes(html, url);
  },

  async watch(episodeUrl: string) {
    const html = await get(episodeUrl);
    const sources: any[] = [];

    // TioAnime stores servers as: var servers = [[id, "ServerName"], ...]
    // And video data as: var videos = [["url1", "url2"], ...]
    // Or sometimes: videos = {"1": "embedUrl", ...}

    // Strategy 1: Look for the servers JSON array in the page scripts
    // TioAnime current format: var videos = [["Mega","https://..."],["Voe","https://..."]]
    const videosMatch = /var\s+videos\s*=\s*(\[[\s\S]*?\]);/i.exec(html);

    if (videosMatch) {
      try {
        const videos = JSON.parse(videosMatch[1]);
        if (Array.isArray(videos)) {
          videos.forEach((item) => {
            if (Array.isArray(item) && item.length >= 2) {
              const serverName = item[0];
              let url = item[1];
              // Decodificar URLs escapadas con \/ si es necesario
              url = url.replace(/\\\//g, '/');
              if (url) sources.push({ server: serverName, url, type: 'embed' });
            }
          });
        }
      } catch (_) {}
    }

    // Strategy 2: Look for data-player or data-src attributes on video server buttons
    if (sources.length === 0) {
      let m: RegExpExecArray | null;
      // <li data-player="BASE64_OR_URL" ...>
      const playerRe = /data-player="([^"]+)"/gi;
      while ((m = playerRe.exec(html)) !== null) {
        let url = m[1];
        // TioAnime often base64-encodes the URL
        try { url = atob(url); } catch (_) {}
        if (url.startsWith('http') || url.startsWith('//')) {
          const fullUrl = url.startsWith('//') ? 'https:' + url : url;
          try {
            const domain = new URL(fullUrl).hostname.replace('www.', '').split('.')[0];
            if (!sources.some(s => s.url === fullUrl)) {
              sources.push({ server: domain, url: fullUrl, type: 'embed' });
            }
          } catch (_) {}
        }
      }
    }

    // Strategy 3: iframe fallback — SKIP chat domains
    if (sources.length === 0) {
      let m: RegExpExecArray | null;
      const chatDomains = ['tioanime.com/chat', 'anychat', 'disqus', 'facebook', 'ads', 'google', 'biribup'];
      const iframeRe = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
      while ((m = iframeRe.exec(html)) !== null) {
        const u = m[1];
        const isChat = chatDomains.some(d => u.toLowerCase().includes(d));
        if (!isChat) {
          try {
            const fullUrl = u.startsWith('//') ? 'https:' + u : u;
            const domain = new URL(fullUrl).hostname.replace('www.', '').split('.')[0];
            sources.push({ server: domain, url: fullUrl, type: 'embed' });
          } catch (_) {}
        }
      }
    }

    return sources;
  },
};
