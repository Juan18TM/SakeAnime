import type { RelatedAnime } from '../services/ExtensionRegistry';

const SEASON_PATTERNS: RegExp[] = [
  /(?:season|temporada)\s*(\d+)/i,
  /(\d+)(?:st|nd|rd|th)\s*season/i,
  /-season-(\d+)(?:$|\/)/i,
  /-(\d+)(?:st|nd|rd|th)-season/i,
];

export function slugFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    return path.split('/').pop() ?? '';
  } catch {
    return url.replace(/\/$/, '').split('/').pop() ?? '';
  }
}

export function extractSeasonNumber(title: string, slug = ''): number | null {
  for (const pattern of SEASON_PATTERNS) {
    const fromTitle = pattern.exec(title);
    if (fromTitle) return parseInt(fromTitle[1], 10);
    const fromSlug = pattern.exec(slug);
    if (fromSlug) return parseInt(fromSlug[1], 10);
  }
  return null;
}

export function stripSeasonFromTitle(title: string): string {
  return title
    .replace(/\s*(?:season|temporada)\s*\d+.*$/i, '')
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season.*$/i, '')
    .replace(/\s+part\s+\d+.*$/i, '')
    .trim();
}

export function resolveProviderForUrl(url: string, fallback: string): string {
  if (url.includes('animefenix2.tv')) return 'animefenix2';
  if (url.includes('tioanime.com')) return 'tioanime';
  if (url.includes('jimov-api') || url.startsWith('/anime/tioanime')) return 'jiruhub';
  return fallback;
}

function seasonOf(entry: RelatedAnime): number {
  return entry.seasonNumber ?? extractSeasonNumber(entry.title, slugFromUrl(entry.url)) ?? 1;
}

export function getAdjacentSeasons(
  currentTitle: string,
  currentUrl: string,
  related: RelatedAnime[]
): { previous?: RelatedAnime; next?: RelatedAnime; all: RelatedAnime[] } {
  const currentSlug = slugFromUrl(currentUrl);
  const currentSeason = extractSeasonNumber(currentTitle, currentSlug) ?? 1;

  const unique = new Map<string, RelatedAnime>();
  for (const item of related) {
    if (slugFromUrl(item.url) === currentSlug) continue;
    unique.set(item.url, item);
  }

  const sorted = [...unique.values()].sort((a, b) => seasonOf(a) - seasonOf(b));

  let previous: RelatedAnime | undefined;
  let next: RelatedAnime | undefined;

  for (const item of sorted) {
    const n = seasonOf(item);
    if (n < currentSeason) previous = item;
    if (n > currentSeason && !next) next = item;
  }

  if (sorted.length === 1 && previous === undefined && next === undefined) {
    const only = sorted[0];
    const n = seasonOf(only);
    if (n < currentSeason) previous = only;
    else if (n > currentSeason) next = only;
  }

  const all = [
    ...sorted.filter(s => seasonOf(s) < currentSeason),
    { title: currentTitle, url: currentUrl, poster: '', seasonNumber: currentSeason },
    ...sorted.filter(s => seasonOf(s) > currentSeason),
  ];

  return { previous, next, all };
}

export function parseTioAnimeCronologia(html: string, baseUrl: string): RelatedAnime[] {
  const results: RelatedAnime[] = [];
  const seen = new Set<string>();

  const sectionRe = /Cronolog[\w\u00ed\u00e0]+a[\s\S]*?<ul class="list-unstyled">([\s\S]*?)<\/ul>/gi;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRe.exec(html)) !== null) {
    const block = sectionMatch[1];
    const itemRe = /<article[^>]*class="[^"]*anime[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let m: RegExpExecArray | null;

    while ((m = itemRe.exec(block)) !== null) {
      const itemBlock = m[1];
      const href = /<a[^>]*href="(\/anime\/[^"]+)"/i.exec(itemBlock);
      const title = /<h3[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i.exec(itemBlock);
      const img = /<img[^>]*src="([^"]+)"/i.exec(itemBlock);
      if (!href || !title) continue;

      const path = href[1];
      const url = path.startsWith('http') ? path : baseUrl + path;
      if (seen.has(url)) continue;
      seen.add(url);

      const t = title[1].replace(/<[^>]+>/g, '').trim();
      results.push({
        title: t,
        url,
        poster: img ? (img[1].startsWith('http') ? img[1] : baseUrl + img[1]) : '',
        seasonNumber: extractSeasonNumber(t, path) ?? undefined,
      });
    }
  }

  return results;
}
