/**
 * VideoExtractor.ts — v4.0
 *
 * Fixes basados en logs reales:
 *  - Voe/Voex: la URL real está ofuscada en el JS del mirror. Voe inyecta
 *    test-videos.co.uk como señuelo. Hay que decodificar la URL real (base64
 *    o reverse string) y descartar explícitamente el señuelo ANTES de validar.
 *  - Streamtape: estructura HTML cambió, nuevos patrones agregados.
 *  - Uqload: necesita cookie + headers específicos.
 *  - StreamHLS / streamhls.to: agregado al matcher de StreamWish.
 *  - re.animepelix.net / re.ironhentai.com: wrappers de redirect — seguir la
 *    redirección para obtener la URL real.
 *  - Mp4Upload "Direct stream bypass": el player intenta reproducir el HTML
 *    directamente cuando no extrae MP4. Corregido con más patrones de extracción.
 */

export interface ExtractedStream {
  url: string;
  type: 'hls' | 'mp4' | 'embed';
  headers?: Record<string, string>;
}

export interface ExtractionResult {
  stream: ExtractedStream | null;
  logs: string[];
}

const BASE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── IPC helpers ─────────────────────────────────────────────────

async function ipcFetchDetails(
  url: string,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; data?: string; finalUrl?: string; error?: string }> {
  const api = (window as any).electronAPI;
  if (!api?.fetch) return { ok: false, status: 0, error: 'IPC fetch missing' };
  try {
    const merged = { 'User-Agent': BASE_UA, ...headers };
    const res = await api.fetch(url, merged);
    return {
      ok: res.ok,
      status: res.status || 0,
      data: typeof res.data === 'string' ? res.data : undefined,
      finalUrl: res.finalUrl || res.url || url,
    };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || String(err) };
  }
}

async function ipcFetch(url: string, headers: Record<string, string> = {}): Promise<string | null> {
  const det = await ipcFetchDetails(url, headers);
  return det.ok && det.data ? det.data : null;
}

async function ipcFetchInBrowser(url: string): Promise<string | null> {
  const api = (window as any).electronAPI;
  if (!api?.fetchInBrowser) return null;
  try {
    const result = await api.fetchInBrowser(url);
    return result?.mediaUrl || null;
  } catch {
    return null;
  }
}

// Sigue redirects de wrappers tipo re.animepelix.net/smart.php?url=...
// o re.ironhentai.com/re.php?id=...
async function resolveRedirect(url: string, log: (m: string) => void): Promise<string> {
  // Caso 1: smart.php?url=<URL_directa>
  const smartMatch = url.match(/[?&]url=([^&]+)/);
  if (smartMatch) {
    try {
      const decoded = decodeURIComponent(smartMatch[1]);
      log(`Resolved smart redirect → ${decoded.slice(0, 80)}`);
      return decoded;
    } catch (_) {}
  }
  // Caso 2: redirect opaco (re.php?id=...) — hacer fetch y seguir Location
  log(`Following redirect: ${url.slice(0, 80)}`);
  const det = await ipcFetchDetails(url, { Referer: 'https://animefenix2.tv/' });
  if (det.finalUrl && det.finalUrl !== url) {
    log(`Redirect resolved to: ${det.finalUrl.slice(0, 80)}`);
    return det.finalUrl;
  }
  // Buscar meta-refresh o window.location en el HTML
  if (det.data) {
    const loc =
      /(?:window\.location(?:\.href)?\s*=\s*|content="0;\s*url=)['"]?(https?:\/\/[^'";\s]+)/i.exec(det.data);
    if (loc) {
      log(`Redirect from HTML: ${loc[1].slice(0, 80)}`);
      return loc[1];
    }
  }
  return url; // sin cambio
}

// ─── Voe helper: decodificar URL ofuscada ────────────────────────
// Voe ofusca la URL HLS real de varias formas:
//   1. Base64: var wurl = atob("...")
//   2. String reversed: "...ts.m3u8".split("").reverse().join("")
//   3. Hex encode
// Y además inyecta test-videos.co.uk como señuelo para confundir scrapers.

function decodeVoeUrl(raw: string): string {
  // Intentar base64
  try {
    const b64 = atob(raw.trim());
    if (b64.startsWith('http') || b64.includes('.m3u8') || b64.includes('.mp4')) return b64;
  } catch (_) {}
  // Intentar string reversed
  const reversed = raw.split('').reverse().join('');
  if (reversed.startsWith('http') || reversed.includes('.m3u8')) return reversed;
  return raw;
}

const VOE_PLACEHOLDER_PATTERNS = [
  'test-videos.co.uk',
  'sample-videos.com',
  'bigbuckbunny',
  'commondatastorage.googleapis.com/gtv-videos-bucket',
  'media.w3.org',
  'download.blender.org',
];

function isVoePlaceholder(url: string): boolean {
  return VOE_PLACEHOLDER_PATTERNS.some(p => url.includes(p));
}

// ─── Voe JSON decoder: decode the obfuscated <script type="application/json"> ──
// Voe stores the player config in a JSON array with a custom encoding:
//   Step 1: ROT13
//   Step 2: Replace 2-char tokens (@$, ^^, ~@, %?, *~, !!, #&) with _
//   Step 3: Remove all _
//   Step 4: Base64 decode
//   Step 5: Subtract 3 from each charCode
//   Step 6: Reverse string
//   Step 7: Base64 decode → JSON with { source: "m3u8_url", ... }

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const code = c.charCodeAt(0);
    const base = code >= 65 && code <= 90 ? 65 : 97;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

function decodeVoeConfig(encoded: string): { source?: string; file_code?: string } | null {
  try {
    // Step 1: ROT13
    let s = rot13(encoded);
    // Step 2: Replace special 2-char tokens
    const tokens = ['@$', '^^', '~@', '%?', '*~', '!!', '#&'];
    for (const token of tokens) {
      s = s.split(token).join('_');
    }
    // Step 3: Remove all underscores
    s = s.split('_').join('');
    // Step 4: Base64 decode
    s = atob(s);
    // Step 5: Subtract 3 from each charCode
    s = Array.from(s).map(c => String.fromCharCode(c.charCodeAt(0) - 3)).join('');
    // Step 6: Reverse
    s = s.split('').reverse().join('');
    // Step 7: Base64 decode
    s = atob(s);
    // Parse JSON
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractVoeStream(html: string): string | null {
  // Strategy 1: Decode from obfuscated JSON in <script type="application/json">
  const jsonMatch = /<script[^>]*type="application\/json"[^>]*>\s*\["([^"]+)"\]\s*<\/script>/i.exec(html);
  if (jsonMatch) {
    const config = decodeVoeConfig(jsonMatch[1]);
    if (config?.source && !isVoePlaceholder(config.source)) {
      return config.source;
    }
  }

  // Strategy 2: var wurl = atob("BASE64")
  const atobMatch = /var\s+(?:wurl|hls)\s*=\s*atob\s*\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)/i.exec(html);
  if (atobMatch) {
    const decoded = decodeVoeUrl(atobMatch[1]);
    if (!isVoePlaceholder(decoded)) return decoded;
  }

  // Strategy 3: var wurl = "BASE64" (sin atob explícito pero es base64)
  const wurlB64 = /var\s+(?:wurl|hls)\s*=\s*['"]([A-Za-z0-9+/=]{40,})['"]/i.exec(html);
  if (wurlB64) {
    const decoded = decodeVoeUrl(wurlB64[1]);
    if (decoded !== wurlB64[1] && !isVoePlaceholder(decoded)) return decoded;
  }

  // Strategy 4: var wurl = "https://..." directo (sin ofuscar)
  const wurlDirect = /var\s+(?:wurl|hls)\s*=\s*['"]([^'"]{20,}\.m3u8[^'"]{0,150})['"]/i.exec(html);
  if (wurlDirect && !isVoePlaceholder(wurlDirect[1])) return wurlDirect[1];

  // Strategy 5: "hls": "..." en JSON dentro del script
  const hlsJson = /"(?:hls|src|file)"\s*:\s*"([^"]{20,}\.m3u8[^"]{0,150})"/i.exec(html);
  if (hlsJson && !isVoePlaceholder(hlsJson[1])) return hlsJson[1].replace(/\\/g, '');

  // Strategy 6: cualquier .m3u8 que NO sea placeholder
  const allM3u8 = [...html.matchAll(/['"]([^'"]{20,}\.m3u8[^'"]{0,150})['"]/gi)];
  for (const m of allM3u8) {
    if (!isVoePlaceholder(m[1])) return m[1].replace(/\\/g, '');
  }

  return null;
}

// ─── Validate & return ───────────────────────────────────────────

async function validateStreamUrl(
  url: string,
  referer?: string,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number }> {
  const api = (window as any).electronAPI;
  if (!api?.validateStream) return { ok: true, status: 200 };
  return await api.validateStream(url, referer, headers);
}

// ─── Main extractor ──────────────────────────────────────────────

export async function extractStream(embedUrl: string): Promise<ExtractionResult> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    console.log(`[Extractor] ${msg}`);
  };

  const tryFetch = async (
    url: string,
    referers: (string | undefined)[] = ['https://animefenix2.tv/'],
    extraHeaders: Record<string, string> = {}
  ): Promise<string | null> => {
    for (const r of [...referers, undefined]) {
      try {
        const headers: Record<string, string> = { ...extraHeaders };
        if (r) headers['Referer'] = r;
        const det = await ipcFetchDetails(url, headers);
        log(`tryFetch: Referer=${r || '<none>'} status=${det.status} size=${det.data?.length ?? 0}`);
        if (det.ok && det.data) return det.data;
      } catch (e: any) {
        log(`tryFetch error: ${e?.message || e}`);
      }
    }
    return null;
  };

  const validateAndReturn = async (
    stream: ExtractedStream,
    referer?: string
  ): Promise<ExtractionResult> => {
    if (stream.type === 'embed') {
      log(`Returning embed for WebView: ${stream.url}`);
      return { stream, logs };
    }
    // Rechazar placeholder/señuelos antes de validar
    if (isVoePlaceholder(stream.url)) {
      log(`Placeholder URL detected — skipping: ${stream.url.slice(0, 80)}`);
      return { stream: null, logs };
    }
    log(`Validating: ${stream.url.slice(0, 80)}...`);
    const headers = (stream as any).headers || {};
    let ok = true; let status = 200;
    try {
      const validator = await validateStreamUrl(stream.url, referer, headers) as any;
      if (typeof validator === 'function') {
        const res = await validator(headers); ok = !!res.ok; status = res.status || 0;
      } else {
        ok = !!validator.ok; status = validator.status || 0;
      }
    } catch (_) { ok = false; status = 0; }
    log(`Validation: HTTP ${status}`);
    if (status === 0) { log('status==0 — accepting as fallback.'); return { stream, logs }; }
    if (!ok) { log(`Validation failed (HTTP ${status}).`); return { stream: null, logs }; }
    log('Stream valid.');
    return { stream, logs };
  };

  log(`Starting extraction: ${embedUrl}`);

  try {
    const api = (window as any).electronAPI;
    if (!api?.fetch) {
      log('Error: IPC fetch not available');
      return { stream: null, logs };
    }

    // ── Redirect wrappers (re.animepelix.net, re.ironhentai.com, etc.) ──
    if (
      embedUrl.includes('re.animepelix.net') ||
      embedUrl.includes('re.ironhentai.com') ||
      embedUrl.match(/\/re\.php|\/smart\.php|\/face\.php|\/vt\.php/)
    ) {
      log('Matched: redirect wrapper — resolving...');
      const resolved = await resolveRedirect(embedUrl, log);
      if (resolved !== embedUrl) {
        log(`Wrapper resolved to: ${resolved.slice(0, 80)}`);
        // Relanzar extracción con la URL real
        return extractStream(resolved);
      }
      log('Could not resolve wrapper — returning embed.');
      return { stream: { url: embedUrl, type: 'embed' }, logs };
    }

    // ── Directos ─────────────────────────────────────────────────
    if (embedUrl.includes('.m3u8')) {
      log('Direct HLS detected.');
      return validateAndReturn({ url: embedUrl, type: 'hls' });
    }
    if (embedUrl.match(/\.mp4(\?|$)/)) {
      log('Direct MP4 detected.');
      return validateAndReturn({ url: embedUrl, type: 'mp4' });
    }

    // ── Voe / Voex ───────────────────────────────────────────────
    if (
      embedUrl.includes('voe.sx') ||
      embedUrl.includes('voe.network') ||
      embedUrl.includes('voex.')
    ) {
      log('Matched: Voe/Voex');

      // Intento 1: fetchInBrowser con intercepción de red (más fiable)
      const browserUrl = await ipcFetchInBrowser(embedUrl);
      if (browserUrl && !isVoePlaceholder(browserUrl)) {
        // Check if it's a tracking GIF with mu= parameter containing the real m3u8
        if (/\.gif(\?|$)/i.test(browserUrl)) {
          const muMatch = /[?&]mu=([^&]+)/i.exec(browserUrl);
          if (muMatch) {
            const realM3u8 = decodeURIComponent(muMatch[1]);
            if (realM3u8.includes('.m3u8')) {
              log(`Voe/Voex: extracted m3u8 from tracking GIF mu=: ${realM3u8.slice(0, 80)}`);
              return validateAndReturn({ url: realM3u8, type: 'hls', headers: { Referer: 'https://voe.sx/' } }, 'https://voe.sx/');
            }
          }
        }
        if (browserUrl.includes('.m3u8')) {
          log(`Voe/Voex: intercepted HLS via browser: ${browserUrl.slice(0, 80)}`);
          return validateAndReturn({ url: browserUrl, type: 'hls', headers: { Referer: 'https://voe.sx/' } }, 'https://voe.sx/');
        }
      }

      // Intento 2: fetch + decodificación
      // voe.sx may 404; try the mirror jessicayeahcatch.com directly
      let html = await tryFetch(embedUrl, ['https://animefenix2.tv/', 'https://voe.sx/']);
      
      // If voe.sx failed, extract ID and try mirror
      if (!html) {
        const voeIdMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/);
        if (voeIdMatch) {
          const mirrorUrl = `https://jessicayeahcatch.com/e/${voeIdMatch[1]}`;
          log(`Voe: trying mirror ${mirrorUrl}`);
          html = await tryFetch(mirrorUrl, ['https://voe.sx/', 'https://animefenix2.tv/']);
        }
      }

      if (html) {
        // Seguir mirror interno
        const mirrorMatch =
          /(?:window\.|)location\.(?:href|replace|assign)\s*\(?\s*['"]([^'")\s]+)['"]/i.exec(html) ||
          /window\.location\.href\s*=\s*['"]([^'"]+)['"]/i.exec(html);

        const targetHtml = mirrorMatch
          ? (await tryFetch(mirrorMatch[1], ['https://voe.sx/', 'https://animefenix2.tv/']) || html)
          : html;

        if (mirrorMatch) log(`Voe mirror: ${mirrorMatch[1]}`);

        const hlsUrl = extractVoeStream(targetHtml);
        if (hlsUrl) {
          log(`Voe/Voex: found HLS: ${hlsUrl.slice(0, 80)}`);
          return validateAndReturn({ url: hlsUrl, type: 'hls', headers: { Referer: 'https://voe.sx/' } }, 'https://voe.sx/');
        }
      }

      log('Voe/Voex: all methods failed — embed fallback.');
      return { stream: { url: embedUrl, type: 'embed' }, logs };
    }

    // ── StreamWish / FileLions / StreamHLS ────────────────────────
    if (
      embedUrl.includes('streamwish') ||
      embedUrl.includes('filelions') ||
      embedUrl.includes('wishembed') ||
      embedUrl.includes('swdyu') ||
      embedUrl.includes('streamhls.to') ||
      embedUrl.includes('streamhls.')
    ) {
      log('Matched: StreamWish/FileLions/StreamHLS');
      const html = await ipcFetch(embedUrl, { Referer: 'https://animefenix2.tv/' });
      if (html) {
        const m3u8 = /file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i.exec(html) ||
          /source\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i.exec(html) ||
          /['"]([^'"]{20,}\.m3u8[^'"]{0,100})['"]/i.exec(html);
        if (m3u8) return validateAndReturn({ url: m3u8[1], type: 'hls' }, embedUrl);
        const mp4 = /file\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i.exec(html);
        if (mp4) return validateAndReturn({ url: mp4[1], type: 'mp4' }, embedUrl);
      }
      // StreamHLS puede necesitar browser
      const browserUrl = await ipcFetchInBrowser(embedUrl);
      if (browserUrl) {
        const type = browserUrl.includes('.m3u8') ? 'hls' : 'mp4';
        return validateAndReturn({ url: browserUrl, type }, embedUrl);
      }
      log('StreamWish/StreamHLS extraction failed.');
      return { stream: { url: embedUrl, type: 'embed' }, logs };
    }

    // ── Ok.ru ─────────────────────────────────────────────────────
    if (embedUrl.includes('ok.ru') || embedUrl.includes('odnoklassniki')) {
      log('Matched: Ok.ru');
      const html = await ipcFetch(embedUrl, { Referer: 'https://animefenix2.tv/' });
      if (html) {
        const okMatch = /data-options="([^"]+)"/i.exec(html);
        if (okMatch) {
          try {
            const data = JSON.parse(okMatch[1].replace(/&quot;/g, '"'));
            const meta = JSON.parse(data.flashvars.metadata);
            if (meta.hlsManifestUrl) return validateAndReturn({ url: meta.hlsManifestUrl, type: 'hls' }, 'https://ok.ru/');
            if (meta.videos?.length) return validateAndReturn({ url: meta.videos[meta.videos.length - 1].url, type: 'mp4' }, 'https://ok.ru/');
          } catch { log('Ok.ru: JSON parse failed.'); }
        }
      }
      log('Ok.ru extraction failed.');
      return { stream: null, logs };
    }

    // ── YourUpload ────────────────────────────────────────────────
    if (embedUrl.includes('yourupload')) {
      log('Matched: YourUpload');
      const mediaUrl = await ipcFetchInBrowser(embedUrl);
      if (mediaUrl && !mediaUrl.startsWith('blob:')) {
        const type = mediaUrl.includes('.m3u8') ? 'hls' : 'mp4';
        return validateAndReturn({ url: mediaUrl, type, headers: { Referer: 'https://www.yourupload.com/' } }, 'https://www.yourupload.com/');
      }
      const html = await ipcFetch(embedUrl, { Referer: 'https://www.yourupload.com/' });
      if (html) {
        const m3 = /https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*/i.exec(html);
        if (m3) return validateAndReturn({ url: m3[0], type: 'hls', headers: { Referer: 'https://www.yourupload.com/' } }, 'https://www.yourupload.com/');
        const mp4 = /https?:\/\/[^"'<>\s]+\.mp4[^"'<>\s]*/i.exec(html);
        if (mp4) return validateAndReturn({ url: mp4[0], type: 'mp4', headers: { Referer: 'https://www.yourupload.com/' } }, 'https://www.yourupload.com/');
      }
      log('YourUpload: fallback to embed.');
      return { stream: { url: embedUrl, type: 'embed' }, logs };
    }

    // ── Mp4Upload ─────────────────────────────────────────────────
    if (embedUrl.includes('mp4upload.com')) {
      log('Matched: Mp4Upload');
      // Normalizar: convertir /embed-ID.html o /ID.html a /embed-ID.html
      let fetchUrl = embedUrl;
      const idMatch = embedUrl.match(/mp4upload\.com\/(?:embed-)?([a-z0-9]+)(?:\.html)?/i);
      if (idMatch) fetchUrl = `https://www.mp4upload.com/embed-${idMatch[1]}.html`;
      log(`Mp4Upload fetching: ${fetchUrl}`);

      const html = await ipcFetch(fetchUrl, {
        Referer: 'https://www.mp4upload.com/',
        Cookie: 'playerConfigs=1',
        Origin: 'https://www.mp4upload.com',
      });
      if (html) {
        const patterns = [
          /(?:src|file)\s*:\s*["']([^"']+\.mp4[^"']*)['"]/i,
          /"(?:src|file)"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
          /player\.setup\s*\([\s\S]*?file\s*:\s*["']([^"']+\.mp4[^"']*)['"]/i,
          /sources\s*:\s*\[[\s\S]*?["']([^"']+\.mp4[^"']*)["']/i,
          /https?:\/\/[^"'<>\s]+\.mp4[^"'<>\s]*/i,
        ];
        for (const p of patterns) {
          const m = p.exec(html);
          if (m) {
            const url = m[1] || m[0];
            log(`Mp4Upload: found MP4: ${url.slice(0, 80)}`);
            return validateAndReturn({ url, type: 'mp4' }, 'https://www.mp4upload.com/');
          }
        }
        log(`Mp4Upload: no MP4 found. HTML snippet: ${html.slice(0, 300).replace(/\s+/g, ' ')}`);
      }
      // Fallback: browser interception
      const browserUrl = await ipcFetchInBrowser(fetchUrl);
      if (browserUrl && (browserUrl.includes('.mp4') || browserUrl.includes('.m3u8'))) {
        const type = browserUrl.includes('.m3u8') ? 'hls' : 'mp4';
        return validateAndReturn({ url: browserUrl, type }, 'https://www.mp4upload.com/');
      }
      log('Mp4Upload extraction failed.');
      return { stream: null, logs };
    }

    // ── Streamtape ────────────────────────────────────────────────
    if (embedUrl.includes('streamtape.com') || embedUrl.includes('streamtape.net')) {
      log('Matched: Streamtape');
      // Normalizar a /e/ embed
      let fetchUrl = embedUrl;
      const stIdMatch = embedUrl.match(/streamtape\.[a-z]+\/(?:e|v)\/([A-Za-z0-9_\-]+)/i);
      if (stIdMatch) fetchUrl = `https://streamtape.com/e/${stIdMatch[1]}`;
      log(`Streamtape fetching: ${fetchUrl}`);

      const html = await ipcFetch(fetchUrl, {
        Referer: 'https://animefenix2.tv/',
        'sec-fetch-dest': 'iframe',
      });
      if (html) {
        // Patrón 1: id="ideoooolink"
        const p1 = /id="ideoooolink"[^>]*>([^<]+)<\/a>/i.exec(html);
        if (p1) return validateAndReturn({ url: 'https:' + p1[1].trim(), type: 'mp4' }, 'https://streamtape.com/');

        // Patrón 2: innerHTML concatenation obfuscation
        const p2 = html.match(/innerHTML\s*=\s*[^+]+\+\s*\(?['"]([^'"]+)['"]\s*\+\s*['"]([^'"]+)['"]\)?/i);
        if (p2) return validateAndReturn({ url: 'https://streamtape.com' + p2[1] + p2[2], type: 'mp4' }, 'https://streamtape.com/');

        // Patrón 3: get_video URL directa
        const p3 = /\/\/[^"']*streamtape\.[a-z]+\/get_video\?[^"'\s<>]+/i.exec(html);
        if (p3) return validateAndReturn({ url: 'https:' + p3[0], type: 'mp4' }, 'https://streamtape.com/');

        // Patrón 4: var videoupdate / robotlink
        const p4 = /(?:robotlink|videoupdate)['")\s]*(?:innerHTML\s*=|=)[^'"]*['"]([^'"]{20,})['"]/i.exec(html);
        if (p4) {
          const raw = p4[1];
          const url = raw.startsWith('//') ? 'https:' + raw : raw.startsWith('http') ? raw : 'https://streamtape.com' + raw;
          return validateAndReturn({ url, type: 'mp4' }, 'https://streamtape.com/');
        }

        // Patrón 5: cualquier URL cdn/streamtape en el HTML
        const p5 = /https?:\/\/[a-z0-9\-]+\.tapecontent\.[a-z]+\/[^"'\s<>]+\.mp4[^"'\s<>]*/i.exec(html);
        if (p5) return validateAndReturn({ url: p5[0], type: 'mp4' }, 'https://streamtape.com/');

        log(`Streamtape: no pattern matched. Snippet: ${html.slice(0, 400).replace(/\s+/g, ' ')}`);
      }
      // Fallback: browser
      const browserUrl = await ipcFetchInBrowser(fetchUrl);
      if (browserUrl && browserUrl.includes('.mp4')) {
        return validateAndReturn({ url: browserUrl, type: 'mp4' }, 'https://streamtape.com/');
      }
      log('Streamtape extraction failed.');
      return { stream: null, logs };
    }

    // ── Netu / HQQ ────────────────────────────────────────────────
    if (embedUrl.includes('hqq.tv') || embedUrl.includes('netu')) {
      log('Matched: Netu/HQQ');
      const html = await ipcFetch(embedUrl, { Referer: 'https://animefenix2.tv/' });
      if (html) {
        const patterns = [
          /file\s*:\s*["']?(https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*)/i,
          /url\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/i,
          /"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
        ];
        for (const p of patterns) {
          const m = p.exec(html);
          if (m && !m[1].includes('undefined')) {
            return validateAndReturn({ url: m[1].replace(/\\/g, ''), type: 'hls' }, 'https://hqq.tv/');
          }
        }
      }
      log('Netu/HQQ extraction failed.');
      return { stream: null, logs };
    }

    // ── Doodstream ────────────────────────────────────────────────
    if (embedUrl.includes('dood') || embedUrl.includes('doodstream')) {
      log('Matched: Doodstream');
      const html = await ipcFetch(embedUrl, { Referer: 'https://dood.to/' });
      if (html) {
        const passMatch = /\/pass_md5\/[^"]+/i.exec(html);
        const tokenMatch = /\?token=([^&'"]+)/i.exec(html);
        if (passMatch) {
          const passHtml = await ipcFetch('https://dood.to' + passMatch[0], { Referer: embedUrl });
          if (passHtml) {
            const mp4Url = passHtml.trim() + `?token=${tokenMatch?.[1] || ''}&expiry=${Date.now()}`;
            return validateAndReturn({ url: mp4Url, type: 'mp4' }, 'https://dood.to/');
          }
        }
      }
      log('Doodstream extraction failed.');
      return { stream: null, logs };
    }

    // ── Uqload ────────────────────────────────────────────────────
    if (embedUrl.includes('uqload')) {
      log('Matched: Uqload');
      // Normalizar URL a embed
      const uqIdMatch = embedUrl.match(/uqload\.[a-z]+\/(?:embed-)?([a-z0-9]+)(?:\.html)?/i);
      const fetchUrl = uqIdMatch
        ? `https://uqload.co/embed-${uqIdMatch[1]}.html`
        : embedUrl;
      log(`Uqload fetching: ${fetchUrl}`);

      const html = await ipcFetch(fetchUrl, {
        Referer: 'https://animefenix2.tv/',
        Cookie: 'lang=1',
        'sec-fetch-dest': 'iframe',
        Origin: 'https://animefenix2.tv',
      });
      if (html) {
        const patterns = [
          /sources\s*:\s*\[\s*["']([^"']+\.mp4[^"']*)['"]/i,
          /(?:file|src)\s*:\s*["']([^"']+\.mp4[^"']*)['"]/i,
          /"(?:file|src)"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
          /https?:\/\/[^"'<>\s]+\.mp4[^"'<>\s]*/i,
          /["']([^'"]{20,}\.m3u8[^'"]{0,100})['"]/i,
        ];
        for (const p of patterns) {
          const m = p.exec(html);
          if (m) {
            const url = (m[1] || m[0]).replace(/\\/g, '');
            const type = url.includes('.m3u8') ? 'hls' : 'mp4';
            log(`Uqload: found ${type}: ${url.slice(0, 80)}`);
            return validateAndReturn({ url, type }, 'https://uqload.co/');
          }
        }
        log(`Uqload: no pattern matched. Snippet: ${html.slice(0, 300).replace(/\s+/g, ' ')}`);
      }
      // Fallback: browser
      const browserUrl = await ipcFetchInBrowser(fetchUrl);
      if (browserUrl) {
        const type = browserUrl.includes('.m3u8') ? 'hls' : 'mp4';
        return validateAndReturn({ url: browserUrl, type }, 'https://uqload.co/');
      }
      log('Uqload extraction failed.');
      return { stream: null, logs };
    }

    // ── SaveFiles ─────────────────────────────────────────────────
    if (embedUrl.includes('savefiles') || embedUrl.includes('save-files')) {
      log('Matched: SaveFiles');
      const html = await ipcFetch(embedUrl, { Referer: 'https://animefenix2.tv/' });
      if (html) {
        const m3u8 = /file\s*:\s*["']([^"']+\.m3u8[^"']*)['"]/i.exec(html) ||
          /["']([^'"]{20,}\.m3u8[^'"]{0,100})['"]/i.exec(html);
        if (m3u8) return validateAndReturn({ url: m3u8[1], type: 'hls' }, embedUrl);
        const mp4 = /(?:file|src)\s*:\s*["']([^"']+\.mp4[^"']*)['"]/i.exec(html);
        if (mp4) return validateAndReturn({ url: mp4[1], type: 'mp4' }, embedUrl);
      }
      log('SaveFiles extraction failed.');
      return { stream: null, logs };
    }

    // ── PlusTube / DEMO-XONA ──────────────────────────────────────
    if (
      embedUrl.includes('plustube') ||
      embedUrl.includes('plutus') ||
      embedUrl.includes('plusponla') ||
      embedUrl.includes('demoxona') ||
      embedUrl.includes('demo-xona')
    ) {
      log('Matched: PlusTube/DEMO-XONA');
      const browserUrl = await ipcFetchInBrowser(embedUrl);
      if (browserUrl && !browserUrl.startsWith('blob:')) {
        const type = browserUrl.includes('.m3u8') ? 'hls' : 'mp4';
        return validateAndReturn({ url: browserUrl, type, headers: { Referer: embedUrl } }, embedUrl);
      }
      const html = await ipcFetch(embedUrl, { Referer: 'https://animefenix2.tv/' });
      if (html) {
        const m3u8 = /["']([^"']{20,}\.m3u8[^'"]{0,100})['"]/i.exec(html);
        if (m3u8) return validateAndReturn({ url: m3u8[1], type: 'hls' }, embedUrl);
        const mp4 = /(?:file|src)\s*[=:]\s*["']([^"']+\.mp4[^"']*)['"]/i.exec(html);
        if (mp4) return validateAndReturn({ url: mp4[1], type: 'mp4' }, embedUrl);
      }
      log('PlusTube/DEMO-XONA: embed fallback.');
      return { stream: { url: embedUrl, type: 'embed' }, logs };
    }

    // ── PremiunVIP ────────────────────────────────────────────────
    if (embedUrl.includes('premiunvip')) {
      log('Matched: PremiunVIP — JS-rendered, using WebView.');
      return { stream: { url: embedUrl, type: 'embed' }, logs };
    }

    // ── Fallback genérico ─────────────────────────────────────────
    log('No specific provider matched. Trying generic fallback...');
    const html = await tryFetch(embedUrl, ['https://animefenix2.tv/', 'https://tioanime.com/']);
    if (html) {
      const m3u8 = /['"]([^'"]{20,}\.m3u8[^'"]{0,150})['"]/i.exec(html);
      if (m3u8 && !isVoePlaceholder(m3u8[1])) return validateAndReturn({ url: m3u8[1], type: 'hls' });
      const mp4 = /(?:file|source|src)\s*[:=]\s*['"]([^'"]+\.mp4[^'"]*)['"]/i.exec(html);
      if (mp4 && !mp4[1].includes('blank')) return validateAndReturn({ url: mp4[1], type: 'mp4' });
    }

    log('Generic fallback failed. Returning as embed for WebView.');
    return { stream: { url: embedUrl, type: 'embed' }, logs };

  } catch (error: any) {
    log(`Fatal error: ${error?.message || String(error)}`);
    return { stream: null, logs };
  }
}
