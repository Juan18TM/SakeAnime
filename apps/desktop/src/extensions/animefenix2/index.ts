/**
 * AnimeFenix2 Provider for SakeAnime
 * Source: https://animefenix2.tv
 * Language: ES (Spanish) — SUB + DUB
 * Version: 3.0.0
 *
 * Servidores soportados: PremiunVIP, PlusTube, SaveFiles, StreamTape,
 *                        Netu, Uqload, Mp4Upload, Voex
 */

import { getGenreById } from '../../constants/animeGenres';
import { extractSeasonNumber, stripSeasonFromTitle, slugFromUrl } from '../../utils/seasonUtils';
import type { RelatedAnime } from '../../services/ExtensionRegistry';

const BASE_URL = 'https://animefenix2.tv';

async function fetchHTML(url: string, referer: string = BASE_URL): Promise<string> {
  const w = window as any;
  if (w.electronAPI?.fetch) {
    const result = await w.electronAPI.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: referer,
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
    if (!result.ok) throw new Error(result.error ?? `HTTP error fetching: ${url}`);
    return result.data as string;
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: referer } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}



// ─── Parser: catálogo ───────────────────────────────────────────
// Estructura real: <li><article><a href="/slug"><figure>...<img src="cdn...portadas/ID.webp" alt="Title">...</figure><p>Title</p></a></article></li>

function parseAnimeCards(html: string) {
  const items: any[] = [];
  const seen = new Set<string>();

  // Buscar cada <li><article><a href="/slug">
  const cardRegex = /<li>\s*<article>\s*<a\s+href="\/([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/article>\s*<\/li>/gi;

  for (const m of html.matchAll(cardRegex)) {
    const slug = m[1].replace(/\/$/, '');
    if (seen.has(slug) || slug.includes('directorio') || slug.includes('user/')) continue;
    seen.add(slug);

    const block = m[2];

    // Imagen: <img ... src="https://cdn.animemovil2.com/media/portadas/ID.webp" alt="Title">
    const imgMatch = block.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/i)
      || block.match(/<img[^>]*src="([^"]+portadas[^"]+)"/i)
      || block.match(/<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);

    // Título: <p>Title</p> al final del bloque
    const titleMatch = block.match(/<p[^>]*>([^<]+)<\/p>/i);

    // Tipo: <span class="tipo">TV Anime</span>
    const typeMatch = block.match(/<span[^>]*class="tipo"[^>]*>([^<]+)<\/span>/i);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const poster = imgMatch ? imgMatch[1] : '';
    if (!title) continue;

    items.push({
      id: slug,
      title,
      url: BASE_URL + '/' + slug,
      poster,
      type: typeMatch ? typeMatch[1].trim() : 'Anime',
      provider: 'animefenix2',
    });
  }

  return items;
}

// ─── Parser: episodios ──────────────────────────────────────────
// Se cargan vía AJAX: /slug?id=slug&load=episodes&start=0
// Respuesta: <a href="/ver/slug-N" class="episode-card">...<span class="ep-title">Capítulo N</span></a>

function parseEpisodes(html: string, slug: string) {
  const episodes: any[] = [];
  const seen = new Set<number>();

  // Buscar links /ver/slug-N
  const epRegex = /href="\/ver\/([^"]+)-(\d+)"[^>]*>[\s\S]*?<span[^>]*class="ep-title"[^>]*>([^<]*)<\/span>/gi;

  for (const m of html.matchAll(epRegex)) {
    const num = parseInt(m[2]);
    if (isNaN(num) || seen.has(num)) continue;
    seen.add(num);
    episodes.push({
      id: `${slug}-${num}`,
      number: num,
      title: m[3].trim() || `Episodio ${num}`,
      url: BASE_URL + '/ver/' + m[1] + '-' + m[2],
    });
  }

  // Fallback: cualquier link /ver/ que contenga el slug
  if (episodes.length === 0) {
    const fallback = /href="\/ver\/([^"]*?(\d+)[^"]*)"/gi;
    for (const m of html.matchAll(fallback)) {
      const epSlug = m[1];
      if (!epSlug.includes(slug)) continue;
      const num = parseInt(m[2]);
      if (isNaN(num) || seen.has(num)) continue;
      seen.add(num);
      episodes.push({
        id: `${slug}-${num}`,
        number: num,
        title: `Episodio ${num}`,
        url: BASE_URL + '/ver/' + epSlug,
      });
    }
  }

  return episodes.sort((a, b) => a.number - b.number);
}

// ─── Parser: fuentes de video ───────────────────────────────────
// Estructura real: tabsArray['1'] = "<iframe src='https://re.animepelix.net/redirect.php?id=URL_REAL'>";
// La URL real está después de ?id= dentro del iframe src

function detectServer(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('premiunvip')) return 'PremiunVIP';
  if (u.includes('plustube') || u.includes('plutus')) return 'PlusTube';
  if (u.includes('savefiles')) return 'SaveFiles';
  if (u.includes('streamtape')) return 'StreamTape';
  if (u.includes('hqq') || u.includes('netu')) return 'Netu';
  if (u.includes('uqload')) return 'Uqload';
  if (u.includes('mp4upload')) return 'Mp4Upload';
  if (u.includes('voe') || u.includes('voex')) return 'Voex';
  if (u.includes('streamhls') || u.includes('streamwish')) return 'StreamWish';
  if (u.includes('ironhentai') || u.includes('animepelix')) return 'PremiunVIP';
  try { return new URL(url).hostname.replace('www.', '').split('.')[0]; } catch { return 'Server'; }
}

function extractUrlFromRedirect(redirectUrl: string): string {
  // https://re.animepelix.net/redirect.php?id=URL_REAL
  // or https://re.animepelix.net/smart.php?url=URL_REAL
  try {
    const u = new URL(redirectUrl);
    const id = u.searchParams.get('id') || u.searchParams.get('url');
    if (id && id.startsWith('http')) return id;
  } catch {}
  return redirectUrl;
}

function parseVideoSources(html: string): any[] {
  const sources: any[] = [];
  const seen = new Set<string>();

  const add = (server: string, url: string) => {
    const clean = url.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    sources.push({ server: server.trim(), url: clean, type: 'sub' });
  };

  // ── Estrategia 1: tabsArray en <script> ──
  // var tabsArray = new Object();
  // tabsArray['1'] = "<iframe ... src='URL' ...>";
  const tabsRegex = /tabsArray\s*\[\s*['"](\d+)['"]\s*\]\s*=\s*["'](.+?)["']\s*;/gi;
  for (const m of html.matchAll(tabsRegex)) {
    const iframeHtml = m[2];
    // Extraer src del iframe
    const srcMatch = /src=['"]([^'"]+)['"]/i.exec(iframeHtml);
    if (srcMatch) {
      const rawUrl = srcMatch[1];
      const realUrl = extractUrlFromRedirect(rawUrl);
      const server = detectServer(realUrl);
      add(server, realUrl);
    }
  }

  // ── Estrategia 2: var tabs (alternativa) ──
  const tabsAltRegex = /var\s+tabs\s*=\s*(\[[\s\S]*?\]);/i;
  const tabsAltMatch = html.match(tabsAltRegex);
  if (tabsAltMatch) {
    try {
      const arr = JSON.parse(tabsAltMatch[1]);
      for (const item of arr) {
        if (item && item.src) {
          const realUrl = extractUrlFromRedirect(item.src);
          add(detectServer(realUrl), realUrl);
        }
      }
    } catch {}
  }

  // ── Estrategia 3: iframes directos con redirect.php ──
  const iframeRegex = /<iframe[^>]*src=['"](https?:\/\/[^'"]*redirect\.php\?[^'"]+)['"]/gi;
  for (const m of html.matchAll(iframeRegex)) {
    const realUrl = extractUrlFromRedirect(m[1]);
    add(detectServer(realUrl), realUrl);
  }

  // ── Estrategia 4: links de descarga (smart.php) ──
  const dlRegex = /href=['"](https?:\/\/[^'"]*smart\.php\?[^'"]+)['"]/gi;
  for (const m of html.matchAll(dlRegex)) {
    const realUrl = extractUrlFromRedirect(m[1]);
    add(detectServer(realUrl), realUrl);
  }

  // ── Estrategia 5: URLs directas conocidas en el HTML ──
  const knownPatterns: [RegExp, string][] = [
    [/https?:\/\/(?:www\.)?streamtape\.[a-z]+\/(?:e|v)\/[A-Za-z0-9_-]+/gi, 'StreamTape'],
    [/https?:\/\/(?:www\.)?mp4upload\.com\/embed-[A-Za-z0-9_-]+\.html/gi, 'Mp4Upload'],
    [/https?:\/\/(?:www\.)?voe\.sx\/[A-Za-z0-9_-]+/gi, 'Voex'],
    [/https?:\/\/(?:www\.)?voex\.[a-z]+\/[A-Za-z0-9_-]+/gi, 'Voex'],
    [/https?:\/\/(?:www\.)?uqload\.[a-z]+\/embed[A-Za-z0-9_-]+\.html/gi, 'Uqload'],
    [/https?:\/\/(?:www\.)?streamhls\.[a-z]+\/e\/[A-Za-z0-9_-]+/gi, 'StreamWish'],
  ];

  for (const [re, server] of knownPatterns) {
    for (const m of html.matchAll(re)) {
      add(server, m[0]);
    }
  }

  return sources;
}

async function discoverRelatedSeasons(slug: string, title: string): Promise<RelatedAnime[]> {
  const baseSlug = slug
    .replace(/-(\d+)(?:st|nd|rd|th)-season$/i, '')
    .replace(/-season-\d+$/i, '');

  const baseTitle = stripSeasonFromTitle(title);
  if (!baseTitle) return [];

  try {
    const html = await fetchHTML(`${BASE_URL}/directorio/anime?q=${encodeURIComponent(baseTitle)}&p=1`);
    const results = parseAnimeCards(html);
    const seen = new Set<string>();
    const related: RelatedAnime[] = [];

    for (const r of results) {
      const rSlug = slugFromUrl(r.url);
      const sameSeries = rSlug === baseSlug || rSlug.startsWith(`${baseSlug}-`);
      if (!sameSeries || rSlug === slug || seen.has(r.url)) continue;
      seen.add(r.url);
      related.push({
        title: r.title,
        url: r.url,
        poster: r.poster,
        seasonNumber: extractSeasonNumber(r.title, rSlug) ?? undefined,
      });
    }
    return related;
  } catch {
    return [];
  }
}

// ─── Provider ───────────────────────────────────────────────────

export const AnimeFenix2Provider = {
  id: 'animefenix2',
  name: 'AnimeFenix2',
  version: '3.0.0',
  language: 'ES',
  type: 'anime' as const,
  baseUrl: BASE_URL,

  async latest(page: number = 1) {
    const html = await fetchHTML(`${BASE_URL}/directorio/anime?p=${page}`);
    return parseAnimeCards(html);
  },

  async search(query: string, page: number = 1) {
    const q = encodeURIComponent(query);
    const html = await fetchHTML(`${BASE_URL}/directorio/anime?q=${q}&p=${page}`);
    return parseAnimeCards(html);
  },

  async browseByGenre(genreId: string, page: number = 1) {
    const genre = getGenreById(genreId);
    if (!genre) return [];
    const html = await fetchHTML(`${BASE_URL}/directorio/anime?genero=${genre.animefenix2}&p=${page}`);
    return parseAnimeCards(html);
  },

  async detail(url: string) {
    const html = await fetchHTML(url);
    const slug = url.replace(BASE_URL + '/', '').replace(/\/$/, '');

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const synopsisMatch = html.match(/<h2[^>]*>Sinopsis<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i)
      || html.match(/<p[^>]*class="[^"]*text-gray[^"]*"[^>]*>([^<]{50,}?)<\/p>/i);
    const posterMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const statusMatch = html.match(/Finalizado|En emision|Próximamente/i);
    const typeMatch = html.match(/<li[^>]*>.*?Tipo:<\/span>\s*([^<]+)/i);

    const genres: string[] = [];
    for (const m of html.matchAll(/<a[^>]*href="[^"]*genero=\d+"[^>]*>\s*([^<]+?)\s*<\/a>/gi)) {
      genres.push(m[1].trim());
    }

    // Obtener episodios vía AJAX
    let episodes: any[] = [];
    try {
      const epUrl = `${url}?id=${slug}&load=episodes&start=0`;
      const epHtml = await fetchHTML(epUrl);
      episodes = parseEpisodes(epHtml, slug);
    } catch {}

    const relatedSeasons = await discoverRelatedSeasons(slug, titleMatch?.[1]?.trim() ?? slug);

    return {
      title: titleMatch ? titleMatch[1].trim() : slug,
      synopsis: synopsisMatch ? synopsisMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      poster: posterMatch ? posterMatch[1] : '',
      rating: '0',
      status: statusMatch ? statusMatch[0] : '',
      type: typeMatch ? typeMatch[1].trim() : 'Anime',
      genres,
      episodes,
      episodeCount: episodes.length,
      url,
      provider: 'animefenix2',
      relatedSeasons,
    };
  },

  async episodes(animeUrl: string) {
    const html = await fetchHTML(animeUrl);
    const slug = animeUrl.replace(BASE_URL + '/', '').replace(/\/$/, '');
    // Intentar cargar episodios vía AJAX
    try {
      const epUrl = `${animeUrl}?id=${slug}&load=episodes&start=0`;
      const epHtml = await fetchHTML(epUrl);
      const eps = parseEpisodes(epHtml, slug);
      if (eps.length > 0) return eps;
    } catch {}
    // Fallback: parsear de la página principal
    return parseEpisodes(html, slug);
  },

  async watch(episodeUrl: string) {
    console.log(`[AnimeFenix2 watch] fetching: ${episodeUrl}`);
    const html = await fetchHTML(episodeUrl, BASE_URL);
    const sources = parseVideoSources(html);
    console.log(`[AnimeFenix2 watch] found sources:`, sources.map(s => s.server));

    if (sources.length > 0) return sources;

    // Fallback: buscar cualquier iframe
    const iframe = html.match(/<iframe[^>]*src=['"]([^'"]+)['"]/i);
    if (iframe) {
      const realUrl = extractUrlFromRedirect(iframe[1]);
      return [{ server: detectServer(realUrl), url: realUrl, type: 'sub' }];
    }
    return [];
  },

  async latestEpisodes() {
    const html = await fetchHTML(BASE_URL);
    const episodes: Array<{
      id: string;
      number: number;
      title: string;
      url: string;
      animeTitle: string;
      poster: string;
    }> = [];

    // Estructura real del homepage:
    // <a href="/ver/slug-N" title="Title Episodio N" class="text-white">
    //   <img src="poster" alt="title N" ...>
    //   <h3 class="...truncate">Title</h3>
    //   <p class="...">Ep. N</p>
    // </a>
    const epRegex = /<a\s+href="\/ver\/([^"]+)"[^>]*title="([^"]*)"[^>]*class="text-white">\s*<div[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>\s*<p[^>]*>Ep\.\s*(\d+)<\/p>/gi;

    for (const m of html.matchAll(epRegex)) {
      const slug = m[1];
      const poster = m[3];
      const animeTitle = m[4].trim();
      const num = parseInt(m[5]);
      if (isNaN(num)) continue;

      const cleanSlug = slug.replace(/-\d+$/, '');
      episodes.push({
        id: `${cleanSlug}-${num}`,
        number: num,
        title: `Episodio ${num}`,
        url: BASE_URL + '/ver/' + slug,
        animeTitle,
        poster,
      });
    }

    // Fallback: patrón más simple
    if (episodes.length === 0) {
      const fallbackRegex = /<a\s+href="\/ver\/([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>\s*<p[^>]*>Ep\.\s*(\d+)<\/p>/gi;
      for (const m of html.matchAll(fallbackRegex)) {
        const slug = m[1];
        const poster = m[2];
        const animeTitle = m[3].trim();
        const num = parseInt(m[4]);
        if (isNaN(num)) continue;
        const cleanSlug = slug.replace(/-\d+$/, '');
        episodes.push({
          id: `${cleanSlug}-${num}`,
          number: num,
          title: `Episodio ${num}`,
          url: BASE_URL + '/ver/' + slug,
          animeTitle,
          poster,
        });
      }
    }

    // Deduplicar por id
    const seen = new Set<string>();
    return episodes.filter(ep => {
      if (seen.has(ep.id)) return false;
      seen.add(ep.id);
      return true;
    }).slice(0, 20);
  },
};
