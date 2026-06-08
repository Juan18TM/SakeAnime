import { app, BrowserWindow, ipcMain, session, net } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preload = path.join(__dirname, 'preload.js');

let mainWindow: BrowserWindow | null;

// Disable GPU hardware acceleration to fix black screen on AMD GPUs
app.disableHardwareAcceleration();

async function waitForVite(baseUrl: string, maxRetries = 40, delay = 500): Promise<void> {
  const checkUrl = baseUrl.endsWith('/') ? `${baseUrl}src/main.tsx` : `${baseUrl}/src/main.tsx`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const statusCode = await new Promise<number>((resolve, reject) => {
        const req = http.get(checkUrl, res => {
          res.resume();
          resolve(res.statusCode ?? 0);
        });
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
      });

      if (statusCode === 200) {
        console.log('[SakeAnime] Vite is completely ready! (HTTP 200 on main.tsx)');
        await new Promise(r => setTimeout(r, 500)); // Give it half a second extra to settle
        return;
      }
      console.log(`[SakeAnime] Vite compiling (${statusCode}), waiting... (${i + 1}/${maxRetries})`);
    } catch {
      console.log(`[SakeAnime] Waiting for Vite port... (${i + 1}/${maxRetries})`);
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Vite dev server did not start in time');
}

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, '../dist/SakeAnimeLogo.png')
    : path.join(__dirname, '../public/SakeAnimeLogo.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: 'hidden',
    icon: iconPath,
    backgroundColor: '#080B12',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (!app.isPackaged) {
    const targetUrl = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173/';
    console.log('[SakeAnime] Loading URL:', targetUrl);

    waitForVite(targetUrl).then(() => {
      mainWindow!.loadURL(targetUrl);
      mainWindow!.webContents.openDevTools({ mode: 'detach' });
    }).catch(err => {
      console.error('[SakeAnime] waitForVite failed:', err);
      mainWindow!.loadURL(targetUrl);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}


app.whenReady().then(() => {
  // Bypass ISP-level DNS blocks (common for anime sites in Spain/LatAm)
  app.configureHostResolver({
    secureDnsMode: 'secure',
    secureDnsServers: [
      'https://cloudflare-dns.com/dns-query',
      'https://dns.google/dns-query'
    ]
  });

  // Intercept outgoing requests — spoof headers for video servers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = details.url;
    
    // Ignore localhost requests so we don't break Vite dev server
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return callback({ requestHeaders: details.requestHeaders });
    }

    const isVoe = url.includes('voe.sx') || url.includes('jessicayeahcatch.com');
    const isYourUpload = url.includes('yourupload') || url.includes('vidcache.net');
    const isNetu = url.includes('hqq.tv') || url.includes('netu');
    const isMp4Upload = url.includes('mp4upload');
    const isStreamtape = url.includes('streamtape');
    const isStreamwish = url.includes('streamwish') || url.includes('filelions');

    let referer = '';
    if (url.includes('tioanime')) referer = 'https://tioanime.com/';
    else if (url.includes('animeflv')) referer = 'https://www.animeflv.net/';
    
    // Server-specific referers based on JiruHub
    if (isYourUpload) referer = 'https://www.yourupload.com/';
    else if (isVoe) referer = 'https://voe.sx/';
    else if (isNetu) referer = 'https://hqq.tv/';
    else if (isMp4Upload) referer = 'https://www.mp4upload.com/';
    else if (isStreamtape) referer = 'https://streamtape.com/';
    else if (isStreamwish) referer = 'https://streamwish.to/';

    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        ...(referer && { 'Referer': referer })
      }
    });
  });

  // Remove duplicate CORS headers to prevent '*, *' errors
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    Object.keys(responseHeaders).forEach(key => {
      const lower = key.toLowerCase();
      if (lower === 'access-control-allow-origin' ||
          lower === 'access-control-allow-methods' ||
          lower === 'access-control-allow-headers') {
        delete responseHeaders[key];
      }
    });
    callback({
      responseHeaders: {
        ...responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, OPTIONS, PUT, DELETE'],
        'Access-Control-Allow-Headers': ['*'],
      }
    });
  });

  // Intercept image requests for hotlink-protected domains and add Referer
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [
      '*://animefenix2.tv/*', '*://*.animefenix2.tv/*', '*://animefenix.click/*', '*://*.animefenix.click/*',
      '*://tioanime.com/*', '*://*.tioanime.com/*',
      '*://www3.animeflv.net/*', '*://animeflv.net/*'
    ] },
    (details, callback) => {
      try {
        const url = details.url || '';
        let referer = '';
        if (url.includes('animefenix2.tv') || url.includes('animefenix.click') || url.includes('animefenix.com')) referer = 'https://animefenix2.tv/';
        else if (url.includes('tioanime.com')) referer = 'https://tioanime.com/';
        else if (url.includes('animeflv.net')) referer = 'https://www3.animeflv.net/';

        const hdrs = {
          ...details.requestHeaders,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          ...(referer ? { Referer: referer } : {}),
        } as Record<string, string>;

        callback({ requestHeaders: hdrs });
      } catch (e) {
        callback({ requestHeaders: details.requestHeaders });
      }
    }
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Proxy fetch using net module (Electron's Chromium network stack + DoH) ──
// net.fetch runs on the main process session which inherits DoH configuration
// This bypasses CORS and ISP-level DNS blocks
ipcMain.handle('extension:fetch', async (_, url: string, extraHeaders: Record<string, string> = {}) => {
  try {
    console.log('[IPC fetch] →', url);

    try {
      const res = await net.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Referer': (() => { try { return new URL(url).origin + '/'; } catch { return ''; } })(),
          ...extraHeaders,
        }
      });

      console.log('[IPC fetch] ←', res.status, url);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: res.ok, status: res.status, data, type: 'json' };
      } else {
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text, type: 'html' };
      }
    } catch (err: any) {
      console.warn('[IPC fetch] primary net.fetch failed:', err?.message || err, 'URL:', url);

      // If DNS resolution failed, try DoH resolution and request by IP as a fallback
      try {
        const hostname = new URL(url).hostname;
        const doh = await new Promise<any>((resolve, reject) => {
          https.get(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, { headers: { Accept: 'application/dns-json' } }, (r) => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });

        const answers = doh?.Answer || [];
        const ips = answers.map((a: any) => a.data).filter(Boolean);
        for (const ip of ips) {
          try {
            const u = new URL(url);
            const isHttps = u.protocol === 'https:';
            const options: any = {
              hostname: ip,
              port: isHttps ? 443 : 80,
              path: u.pathname + (u.search || ''),
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Host': hostname,
                ...extraHeaders,
              },
            };
            if (isHttps) options.servername = hostname;

            const body = await new Promise<string>((resolve, reject) => {
              const req = (isHttps ? https : http).request(options, (res2) => {
                let data = '';
                res2.on('data', d => data += d);
                res2.on('end', () => resolve(data));
              });
              req.on('error', reject);
              req.end();
            });

            return { ok: true, status: 200, data: body, type: 'html' };
          } catch (ipErr) {
            console.warn('[IPC fetch] fallback request to IP failed:', ipErr instanceof Error ? ipErr.message : ipErr);
            continue;
          }
        }
      } catch (dohErr) {
        console.warn('[IPC fetch] DoH fallback failed:', dohErr instanceof Error ? dohErr.message : dohErr);
      }

      return { ok: false, error: err?.message || String(err), status: 0 };
    }
  } catch (err: any) {
    console.error('[IPC fetch] Error:', err.message, 'URL:', url);
    return { ok: false, error: err.message, status: 0 };
  }
});

// ─── IPC: Execute extension method safely ──────────────────────────────────
ipcMain.handle('execute-extension-method', async (_, { extensionId, method, args }) => {
  try {
    return { success: true, data: [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: fetchInBrowser — create a hidden BrowserWindow to load the page and
// capture network requests to find direct media URLs (used for YourUpload)
ipcMain.handle('extension:fetch-in-browser', async (_, url: string) => {
  console.log('[IPC fetchInBrowser] →', url);
  return new Promise<any>((resolve) => {
    const bw = new BrowserWindow({ show: false, webPreferences: { preload, sandbox: false } });
    let finished = false;

    // Use specific listener functions so we can remove them later and avoid
    // leaking session-level listeners when this helper is called repeatedly.
    const ses = bw.webContents.session;
    // We'll intercept requests before they start using onBeforeRequest so we
    // can cancel heavy downloads (m3u8/mp4) as soon as they are requested.

    const onBeforeSendHeaders = (details: any, callback: any) => {
      try {
        const hdrs = { ...details.requestHeaders };
        hdrs['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        try { hdrs['Referer'] = new URL(url).origin + '/'; } catch {}
        callback({ requestHeaders: hdrs });
      } catch (e) {
        callback({ requestHeaders: details.requestHeaders });
      }
    };

    const cleanup = () => {
      try {
        (ses.webRequest.onBeforeRequest as any).removeListener?.(onBeforeRequest);
      } catch (e) {}
      try {
        (ses.webRequest.onBeforeSendHeaders as any).removeListener?.(onBeforeSendHeaders);
      } catch (e) {}
      try { if (!bw.isDestroyed()) bw.destroy(); } catch (e) {}
    };

    // Intercept requests before they start so we can capture media URLs
    const onBeforeRequest = (details: any, callback: any) => {
      try {
        const durl = details.url || '';
        const isMediaUrl = (durl.includes('.m3u8') || durl.match(/\.mp4(\?|$)/)) && !finished;
        const isTrackingGif = /\.gif(\?|$)/i.test(durl);
        if (isMediaUrl && !isTrackingGif) {
          finished = true;
          console.log('[IPC fetchInBrowser] intercepted', durl);
          // Cancel the navigation/asset fetch to avoid downloading large media
          callback({ cancel: true });
          cleanup();
          resolve({ mediaUrl: durl });
          return;
        }
      } catch (e) {
        // ignore
      }
      callback({});
    };

    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, onBeforeRequest as any);
    ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, onBeforeSendHeaders as any);

    bw.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL) => {
      if (!finished) {
        finished = true;
        console.warn('[IPC fetchInBrowser] did-fail-load', errorCode, errorDesc, validatedURL);
        cleanup();
        resolve(null);
      }
    });

    bw.webContents.on('did-finish-load', () => {
      // If nothing intercepted after load, try to query the DOM for video sources
      bw.webContents
        .executeJavaScript(
          `(function(){
            const vids = Array.from(document.querySelectorAll('video source, video'));
            for (const v of vids) {
              const s = v.src || v.getAttribute('src') || (v.querySelector && v.querySelector('source') && v.querySelector('source').src);
              if (s) return s;
            }
            try { if (window && (window.player || window.jwplayer) && (window.player.config || window.jwplayer().getConfig)) {
              return (window.player && window.player.config && window.player.config.file) || (window.jwplayer && window.jwplayer().getPlaylist && window.jwplayer().getPlaylist()[0] && window.jwplayer().getPlaylist()[0].file);
            } } catch(e){}
            return null;
          })()`
        )
        .then((found: any) => {
          if (!finished && found) {
            finished = true;
            cleanup();
            resolve({ mediaUrl: String(found) });
          } else if (!finished) {
              setTimeout(() => {
                if (!finished) {
                  finished = true;
                  cleanup();
                  resolve(null);
                }
              }, 1200);
          }
        })
        .catch(() => {
          if (!finished) {
            finished = true;
            cleanup();
            resolve(null);
          }
        });
    });

    bw.loadURL(url).catch((err) => {
      if (!finished) {
        finished = true;
        console.warn('[IPC fetchInBrowser] loadURL error', err?.message || err);
        cleanup();
        resolve(null);
      }
    });
  });
});

// ─── IPC: Validate Stream ───────────────────────────────────────────────
// Performs a lightweight GET request (reading only headers) to ensure the stream is alive (HTTP 200/206/302)
ipcMain.handle('extension:validate-stream', async (_, url: string, referer?: string, extraHeaders: Record<string,string> = {}) => {
  // Try primary net.fetch first, then fallback to DoH+IP requests if resolution fails
  const tryPrimary = async (extraHeaders: Record<string,string> = {}) => {
    const res = await net.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...(referer && { 'Referer': referer }),
        ...extraHeaders,
      }
    });

    if (res.body && typeof res.body.cancel === 'function') {
      res.body.cancel().catch(() => {});
    }

    return { ok: res.ok || res.status === 206 || res.status === 302, status: res.status };
  };

  const tryFallback = async () => {
    try {
      const hostname = new URL(url).hostname;
      const doh = await new Promise<any>((resolve, reject) => {
        https.get(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, { headers: { Accept: 'application/dns-json' } }, (r) => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
      });

      const answers = doh?.Answer || [];
      const ips = answers.map((a: any) => a.data).filter(Boolean);
      for (const ip of ips) {
        try {
          const u = new URL(url);
          const isHttps = u.protocol === 'https:';
          const options: any = {
            hostname: ip,
            port: isHttps ? 443 : 80,
            path: u.pathname + (u.search || ''),
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              ...(referer && { 'Referer': referer }),
              'Host': hostname,
            },
          };
          if (isHttps) options.servername = hostname;

          const status = await new Promise<number>((resolve, reject) => {
            const req = (isHttps ? https : http).request(options, (res2) => {
              // No need to collect body; return status code immediately
              resolve(res2.statusCode || 0);
              if (res2.destroy) res2.destroy();
            });
            req.on('error', reject);
            req.end();
          });

          if (status === 200 || status === 206 || status === 302) return { ok: true, status };
        } catch (ipErr) {
          console.warn('[validate-stream] fallback to IP failed:', ipErr instanceof Error ? ipErr.message : ipErr);
          continue;
        }
      }
    } catch (dohErr) {
      console.warn('[validate-stream] DoH resolution failed:', dohErr instanceof Error ? dohErr.message : dohErr);
    }
    return { ok: false, status: 0 };
  };

  // Try with a couple of attempts to handle transient DNS failures
  try {
    try {
      return await tryPrimary(extraHeaders);
    } catch (primaryErr) {
      console.warn('[validate-stream] primary fetch failed:', (primaryErr as Error)?.message || primaryErr);
      // fallback
      return await tryFallback();
    }
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || String(err) };
  }
});

// Fetch an image as base64 so renderer can display it without CORS issues
ipcMain.handle('extension:fetch-image', async (_, url: string) => {
  try {
    const res = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.toString('base64');
  } catch (e) {
    console.warn('[IPC fetch-image] failed', (e as Error)?.message || e);
    return null;
  }
});

// Backward-compatible handler that accepts a referer and returns a full data URI
ipcMain.handle('fetchImage', async (_, url: string, referer: string) => {
  try {
    console.log('[IPC fetchImage] →', url, 'referer=', referer);
    const res = await net.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...(referer ? { Referer: referer } : {}),
      }
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch (e) {
    console.warn('[IPC fetchImage] failed', (e as Error)?.message || e);
    return null;
  }
});

// ─── IPC: Window controls (minimize/maximize/close) ─────────────────────
ipcMain.handle('window:minimize', async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('window:maximize', async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return { ok: true, maximized: false };
      } else {
        mainWindow.maximize();
        return { ok: true, maximized: true };
      }
    }
    return { ok: false, maximized: false };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('window:close', async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('window:is-maximized', async () => {
  try {
    return { ok: true, maximized: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized()) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});
