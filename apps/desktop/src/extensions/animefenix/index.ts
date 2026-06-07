/**
 * AnimeFenix Extension for SakeAnime
 * Provider: https://animefenix.click
 * Language: ES (Spanish) — SUB + DUB
 */

const BASE_URL = 'https://animefenix.click';
const CDN_URL = 'https://animefenix.click/cdn';

// ─── HTTP helper ─────────────────────────────────────────────────

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
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: BASE_URL },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function fetchImageDataURL(url: string): Promise<string> {
  const w = window as any;
  try {
    if (w.electronAPI?.fetchImage) {
      const b64 = await w.electronAPI.fetchImage(url);
      if (b64) return `data:image/*;base64,${b64}`;
    } else if (w.electronAPI?.fetch) {
      // fallback: fetch as text isn't suitable for binary, try regular fetch
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const reader = new FileReader();
      return await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    // ignore and fall through
  }
  return url; // last resort: return original URL
}

function toAbsURL(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : BASE_URL + path;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function getAnimeId(html: string): string {
  const m = html.match(/\/cdn\/(?:screenshots|backdrops|covers)\/(\d+)/);
  return m ? m[1] : '0';
}

// ─── Parser: tarjetas del catálogo ───────────────────────────────

function parseAnimeCards(html: string) {
  const items: any[] = [];
  const seen = new Set<string>();

  const blockRegex = /href="(\/media\/[^/\"]+)"[^>]*>([\s\S]*?)(?=href="\/media\/|<footer|$)/gi;
  for (const m of html.matchAll(blockRegex)) {
    const path = m[1].replace(/\/$/, '');
    if (/\/media\/[^/]+\/\d+/.test(path)) continue; // skip episode links
    if (seen.has(path)) continue;
    seen.add(path);

    const block = m[2];
    const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/i) || block.match(/alt="([^\"]+)"/i);
    const imgMatch = block.match(/<img[^>]*src="([^"]+\/covers\/[^"]+)"/i);
    const typeMatch = block.match(/TV Anime|Película|OVA|Especial|ONA/i);

    if (!titleMatch) continue;

    items.push({
      id: path.replace('/media/', ''),
      title: titleMatch[1].trim(),
      url: BASE_URL + path,
      poster: imgMatch ? toAbsURL(imgMatch[1]) : '',
      type: typeMatch ? typeMatch[0].trim() : 'Anime',
      provider: 'animefenix',
    });
  }

  return items;
}

// ─── Parser: episodios ────────────────────────────────────────────

function parseEpisodes(html: string, animeSlug: string) {
  const episodes: any[] = [];
  const seen = new Set<number>();
  const animeId = getAnimeId(html);

  const epRegex = new RegExp(
    `href="(/media/${escapeRegex(animeSlug)}/(\\d+))"`,
    'gi'
  );

  for (const m of html.matchAll(epRegex)) {
    const num = parseInt((m as any)[2]);
    if (seen.has(num)) continue;
    seen.add(num);
    episodes.push({
      id: `${animeSlug}-${num}`,
      number: num,
      title: `Episodio ${num}`,
      url: BASE_URL + (m as any)[1],
      thumbnail: animeId !== '0' ? `${CDN_URL}/screenshots/${animeId}/${num}.jpg` : '',
    });
  }

    return episodes.sort((a, b) => a.number - b.number);
}

// ─── Parser: servidores de video ──────────────────────────────────
function parseVideoSources(html: string): any[] {
  const sources: any[] = [];
  const seen = new Set<string>();

  const add = (server: string, url: string, type: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push({ server: server.trim(), url: url.trim(), type: type.toLowerCase().includes('dub') ? 'dub' : 'sub' });
  };

  // Formato C: JSON en <script>
  const jsonScript = html.match(/var\s+servers\s*=\s*(\[[\s\S]*?\]);/);
  if (jsonScript) {
    try {
      const arr: { name: string; url: string; lang?: string; type?: string }[] = JSON.parse(jsonScript[1]);
      for (const s of arr) add(s.name, s.url, s.lang || s.type || 'sub');
    } catch {}
  }

  const videosScript = html.match(/var\s+videos\s*=\s*(\{[\s\S]*?\});/);
  if (videosScript) {
    try {
      const obj: Record<string, [string, string][]> = JSON.parse(videosScript[1]);
      for (const [lang, list] of Object.entries(obj)) {
        for (const [server, url] of list) {
          add(server, url, lang);
        }
      }
    } catch {}
  }

  // Formato A: data attributes
  const btnRegex = /<(?:button|a|li)[^>]*data-(?:server|name)="([^"]+)"[^>]*data-(?:type|lang)="([^"]+)"[^>]*data-(?:url|video)="([^"]+)"/gi;
  for (const m of html.matchAll(btnRegex)) add((m as any)[1], (m as any)[3], (m as any)[2]);
  const btnRegex2 = /<(?:button|a|li)[^>]*data-(?:url|video)="([^"]+)"[^>]*data-(?:server|name)="([^"]+)"[^>]*data-(?:type|lang)="([^"]+)"/gi;
  for (const m of html.matchAll(btnRegex2)) add((m as any)[2], (m as any)[1], (m as any)[3]);

  // Formato D: iframe principal
  const iframeSrc = html.match(/<iframe[^>]+src="(https?:\/\/(?:www\.)?(?:premiunvip|plutus|plustube|demoxona|savefiles|streamtape|uqload|mp4upload|voex|zilla-networks|player\.)[^"]+)"/i);
  if (iframeSrc) {
    const iUrl = iframeSrc[1];
    const serverName = iUrl.includes('premiunvip')
      ? 'PremiunVIP'
      : iUrl.includes('plustube')
      ? 'PlusTube'
      : iUrl.includes('demoxona')
      ? 'DEMO-XONA'
      : iUrl.includes('savefiles')
      ? 'SaveFiles'
      : iUrl.includes('streamtape')
      ? 'StreamTape'
      : iUrl.includes('uqload')
      ? 'Uqload'
      : iUrl.includes('mp4upload')
      ? 'Mp4Upload'
      : iUrl.includes('voex')
      ? 'Voex'
      : iUrl.includes('zilla-networks')
      ? 'Zilla'
      : 'Embed';
    add(serverName, iUrl, 'sub');
  }

  // Fallback: busca URLs conocidas
  if (sources.length === 0) {
    const urlPatterns: [RegExp, string][] = [
      [/https?:\/\/(?:www\.)?streamtape\.[a-z]+\/[\^\s"'<>]+/gi, 'StreamTape'],
      [/https?:\/\/(?:www\.)?uqload\.[a-z]+\/[\^\s"'<>]+/gi, 'Uqload'],
      [/https?:\/\/(?:www\.)?mp4upload\.com\/[\^\s"'<>]+/gi, 'Mp4Upload'],
      [/https?:\/\/(?:www\.)?voex\.[a-z]+\/[\^\s"'<>]+/gi, 'Voex'],
      [/https?:\/\/(?:www\.)?savefiles\.[a-z]+\/[\^\s"'<>]+/gi, 'SaveFiles'],
      [/https?:\/\/(?:player\.zilla-networks\.com)\/play\/[a-f0-9]+/gi, 'Zilla'],
    ];
    for (const [re, server] of urlPatterns) {
      for (const m of html.matchAll(re)) add(server, (m as any)[0], 'sub');
    }
  }

  return sources;
}

// ─── Provider ────────────────────────────────────────────────────

export const AnimeFenixProvider = {
  id: 'animefenix',
  name: 'AnimeFenix',
  version: '1.1.0',
  language: 'ES',
  type: 'anime' as const,
  logo: 'https://animefenix.click/images/animefenix-logo.png',
  baseUrl: BASE_URL,

  async latest(page: number = 1) {
    const html = await fetchHTML(`${BASE_URL}/catalogo?order=fecha&page=${page}`);
    const items = parseAnimeCards(html);
    // Attempt to convert remote poster URLs to data URLs via electronAPI.fetchImage
    const w = window as any;
    if (w?.electronAPI?.fetchImage) {
      await Promise.all(items.map(async (it: any) => {
        try {
          if (it.poster) {
            const abs = toAbsURL(it.poster);
            const b64 = await w.electronAPI.fetchImage(abs);
            if (b64) it.poster = `data:image/*;base64,${b64}`;
            else it.poster = abs;
          }
        } catch { /* ignore */ }
      }));
    }
    return items;
  },

  async search(query: string, page: number = 1) {
    const q = encodeURIComponent(query);
    const html = await fetchHTML(`${BASE_URL}/catalogo?q=${q}&page=${page}`);
    const items = parseAnimeCards(html);
    const w = window as any;
    if (w?.electronAPI?.fetchImage) {
      await Promise.all(items.map(async (it: any) => {
        try {
          if (it.poster) {
            const abs = toAbsURL(it.poster);
            const b64 = await w.electronAPI.fetchImage(abs);
            if (b64) it.poster = `data:image/*;base64,${b64}`;
            else it.poster = abs;
          }
        } catch { /* ignore */ }
      }));
    }
    return items;
  },

  async detail(url: string) {
    const html = await fetchHTML(url);
    const slug = url.replace(BASE_URL + '/media/', '').replace(/\/$/, '');

    const titleMatch = html.match(/<h1[^>]*>\s*([^<\n]+?)\s*<\/h1>/i);
    const altTitleMatch = html.match(/<h2[^>]*>\s*([^<\n]+?)\s*<\/h2>/i);
    const synopsisMatch = html.match(/<p[^>]*>\s*([^<]{60,}?)\s*<\/p>/i);
    const posterMatch = html.match(/<img[^>]*src="([^\"]+\/covers\/[^\"]+)"/i);
    const backdropMatch = html.match(/<img[^>]*src="([^\"]+\/backdrops\/[^\"]+)"/i);
    const statusMatch = html.match(/En emisión|Finalizado|Próximamente/i);
    const typeMatch = html.match(/TV Anime|Película|OVA|Especial|ONA/i);
    const ratingMatch = html.match(/MAL RATING[\s\S]{0,50}?(\d+\.?\d*)/i);

    const genreMatches = [...html.matchAll(/<a[^>]*href="[^"]*\/catalogo\?genre=[^"]*"[^>]*>([^<]+)<\/a>/gi)];
    const genres = genreMatches.map(m => (m as any)[1].trim());
    const episodes = parseEpisodes(html, slug);

    return {
      title: titleMatch ? (titleMatch[1].trim()) : slug,
      altTitle: altTitleMatch ? altTitleMatch[1].trim() : '',
      synopsis: synopsisMatch ? synopsisMatch[1].trim() : '',
      poster: posterMatch ? await (async () => {
        const p = toAbsURL(posterMatch[1]);
        // attempt to load via electron to bypass cross-origin blocking
        try { return await fetchImageDataURL(p); } catch { return p; }
      })() : '',
      backdrop: backdropMatch ? toAbsURL(backdropMatch[1]) : '',
      rating: ratingMatch ? ratingMatch[1] : '0',
      status: statusMatch ? statusMatch[0] : '',
      type: typeMatch ? typeMatch[0] : 'Anime',
      genres,
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'animefenix',
    };
  },

  async episodes(animeUrl: string) {
    const html = await fetchHTML(animeUrl);
    const slug = animeUrl.replace(BASE_URL + '/media/', '').replace(/\/$/, '');
    return parseEpisodes(html, slug);
  },

  async watch(episodeUrl: string) {
    const html = await fetchHTML(episodeUrl);
    // Prefer servers provided in inline scripts (parseVideoSources already handles this)
    const sources = parseVideoSources(html);
    // If the page provides a "videos" or "servers" script with exact servers, return those.
    if (sources.length > 0) return sources;

    // Last resort: return the embed iframe as a single source
    const iframe = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (iframe) return [{ server: 'Embed', url: iframe[1], type: 'sub' }];
    return [];
  },
};
