import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle, Bug, Check } from 'lucide-react';
import { extensionRegistry } from '../services/ExtensionRegistry';
import { extractStream } from '../services/VideoExtractor';
import { useAuthStore } from '../stores/authStore';
import { isEpisodeWatched, markEpisodeWatched, unmarkEpisodeWatched } from '../services/watchedService';
import { AuthModal } from '../components/AuthModal';
import clsx from 'clsx';
import Hls from 'hls.js';

interface VideoSource {
  server: string;
  url: string;
  type: string;
}

interface ExtractedStream {
  url: string;
  type: 'hls' | 'mp4' | 'embed';
}

interface VideoPlayerProps {
  episodeUrl: string;
  providerId: string;
  anime: { url: string; title: string; poster: string };
  episode: { number: number; title: string };
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ episodeUrl, providerId, anime, episode, onBack }) => {
  const { user } = useAuthStore();
  const [watched, setWatched] = useState(false);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Obteniendo servidores...');
  const [error, setError] = useState<string | null>(null);
  const [extractedStream, setExtractedStream] = useState<ExtractedStream | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  // Debug Panel State
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<{ server: string; url: string; logs: string[] }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const serverListRef = useRef<VideoSource[]>([]);
  const currentIndexRef = useRef<number>(0);
  const mounted = useRef(true);

  const addDebugLog = (server: string, url: string, logs: string[]) => {
    setDebugLogs(prev => [...prev, { server, url, logs }]);
  };

  useEffect(() => {
    if (!user) {
      setWatched(false);
      return;
    }
    isEpisodeWatched(user.id, episodeUrl, providerId).then(setWatched);
  }, [user, episodeUrl, providerId]);

  const toggleWatched = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setWatchedLoading(true);
    try {
      if (watched) {
        await unmarkEpisodeWatched(user.id, episodeUrl, providerId);
        setWatched(false);
      } else {
        await markEpisodeWatched(user.id, {
          episodeUrl,
          providerId,
          animeUrl: anime.url,
          animeTitle: anime.title,
          animePoster: anime.poster,
          episodeNumber: episode.number,
          episodeTitle: episode.title,
        });
        setWatched(true);
      }
    } catch {
      // silencioso
    } finally {
      setWatchedLoading(false);
    }
  };

  const tryNextServer = useCallback(async (list: VideoSource[], index: number): Promise<boolean> => {
    if (!mounted.current) return false;

    if (index >= list.length) {
      setError('Todos los servidores de video están caídos o el formato no es compatible. Por favor, intenta con otro proveedor u otro episodio.');
      setLoading(false);
      return false;
    }

    currentIndexRef.current = index;
    const source = list[index];
    setStatusText(`Conectando a servidor: ${source.server}...`);

    if (source.url.includes('.m3u8') || source.url.includes('.mp4') || source.type === 'direct') {
      addDebugLog(source.server, source.url, ['Direct stream bypass used.']);
      setExtractedStream({
        url: source.url,
        type: source.url.includes('.m3u8') ? 'hls' : 'mp4'
      });
      return true;
    }

    const { stream, logs } = await extractStream(source.url);
    if (!mounted.current) return false;

    addDebugLog(source.server, source.url, logs);

    if (stream) {
      setExtractedStream(stream);
      return true;
    } else {
      return await tryNextServer(list, index + 1);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);
    setExtractedStream(null);
    setFallbackUrl(null);
    setDebugLogs([]);

    const init = async () => {
      try {
        const provider = extensionRegistry.getProvider(providerId);
        if (!provider) throw new Error('Proveedor no encontrado');

        setStatusText('Obteniendo servidores de video...');
        const data = await provider.watch(episodeUrl);
    if (!mounted.current) return false;

        if (data.length === 0) {
          throw new Error('No se encontraron servidores para este episodio.');
        }

        const priority = ['voe', 'streamwish', 'filelions', 'okru', 'ok.ru', 'mp4upload'];
        const sorted = [...data].sort((a, b) => {
          const ai = priority.findIndex(p => a.server.toLowerCase().includes(p));
          const bi = priority.findIndex(p => b.server.toLowerCase().includes(p));
          if (ai !== -1 && bi === -1) return -1;
          if (ai === -1 && bi !== -1) return 1;
          if (ai !== -1 && bi !== -1) return ai - bi;
          return 0;
        });

        serverListRef.current = sorted;
        // Try servers in the sorted priority order. Do not restrict to a single
        // host (like YourUpload) — fall back through the list if one fails.
        const ok = await tryNextServer(sorted, 0);
        if (!ok) {
          setError('Todos los servidores fallaron o no contienen un stream válido. Por favor intenta otro proveedor.');
          setLoading(false);
          return;
        }
      } catch (err: any) {
        if (mounted.current) setError(err.message || 'Error al cargar el episodio');
      }
    };

    init();

    return () => {
      mounted.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [episodeUrl, providerId, tryNextServer]);

  useEffect(() => {
    if (!extractedStream || !videoRef.current) return;

    const video = videoRef.current;
    let errorFired = false;

    const onFatal = () => {
      if (errorFired || !mounted.current) return;
      errorFired = true;
      console.warn('[VideoPlayer] Playback failed, trying next server...');
      setDebugLogs(prev => {
        const newLogs = [...prev];
        if (newLogs.length > 0) {
          newLogs[newLogs.length - 1].logs.push('[HLS Error] Player failed to load stream. Falling back.');
        }
        return newLogs;
      });
      setExtractedStream(null);
      setLoading(true);
      tryNextServer(serverListRef.current, currentIndexRef.current + 1);
    };

    if (extractedStream.type === 'embed') {
      console.warn('[VideoPlayer] Embed type not playable, trying next server...');
      setExtractedStream(null);
      setLoading(true);
      tryNextServer(serverListRef.current, currentIndexRef.current + 1);
      return;
    }

    if (extractedStream.type === 'hls' && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();

      const hls = new Hls({ enableWorker: true, maxMaxBufferLength: 30 });
      hlsRef.current = hls;
      // If extractor provided headers, ensure hls.js includes them on XHRs
      if ((extractedStream as any).headers) {
        const headers = (extractedStream as any).headers as Record<string,string>;
        hls.config.xhrSetup = (xhr: XMLHttpRequest, _url: string) => {
          try {
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
          } catch (e) {}
        };
      }
      hls.loadSource(extractedStream.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[HLS Fatal Error]', data.details, data.url);
          hls.destroy();
          onFatal();
        }
      });
    } else {
      video.src = extractedStream.url;
      video.onerror = onFatal;
      setLoading(false);
      video.play().catch(() => {});
    }

    return () => {
      video.onerror = null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [extractedStream, tryNextServer]);

  return (
    <div className="flex flex-col h-full bg-black relative group overflow-hidden">
      {/* Top Controls — appears on hover */}
      <div className="absolute top-0 left-0 right-0 p-6 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <button
          onClick={onBack}
          className="p-3 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all pointer-events-auto active:scale-95 border border-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleWatched}
            disabled={watchedLoading}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-md transition-all active:scale-95 border text-sm font-semibold',
              watched
                ? 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30'
                : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
            )}
          >
            {watchedLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} strokeWidth={watched ? 3 : 2} />
            )}
            {watched ? 'Visto' : 'Marcar visto'}
          </button>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-3 rounded-xl backdrop-blur-md transition-all active:scale-95 border border-white/10 ${showDebug ? 'bg-primary text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}
          >
            <Bug size={20} />
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="absolute top-24 right-6 w-[400px] max-h-[calc(100%-8rem)] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40 overflow-y-auto pointer-events-auto shadow-2xl flex flex-col gap-4 text-xs font-mono text-gray-300">
          <h3 className="text-white font-sans font-bold text-lg mb-2 flex items-center gap-2">
            <Bug size={18} /> Extraction Debugger
          </h3>
          {debugLogs.map((entry, idx) => (
            <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/5">
              <div className="font-bold text-primary mb-1">Server: {entry.server}</div>
              <div className="text-gray-400 break-all mb-2 flex flex-col">
                <span className="font-sans font-semibold text-gray-300 text-[10px] uppercase tracking-wider">Embed URL</span>
                {entry.url}
              </div>
              <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
                {entry.logs.map((log, lidx) => (
                  <div key={lidx} className={`${log.includes('Error') || log.includes('failed') ? 'text-red-400' : log.includes('successfully') ? 'text-green-400' : ''}`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {debugLogs.length === 0 && <div className="text-muted">No logs available yet.</div>}
        </div>
      )}

      {/* Player Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {loading && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-muted font-medium tracking-wide">{statusText}</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 max-w-md text-center p-6 bg-card rounded-2xl border border-white/5">
            <AlertCircle className="text-red-500" size={48} />
            <h3 className="text-xl font-bold text-white">No se pudo reproducir</h3>
            <p className="text-muted text-sm">{error}</p>
            <button onClick={onBack} className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors">
              Volver atrás
            </button>
          </div>
        )}

        {/* Native video player */}
        <video
          ref={videoRef}
          controls
          autoPlay
          className={`w-full h-full outline-none ${!extractedStream || loading ? 'hidden' : ''}`}
          crossOrigin="anonymous"
        />

        {/* Iframe fallback */}
        {!loading && !error && fallbackUrl && !extractedStream && (
          <iframe
            src={fallbackUrl}
            allowFullScreen
            className="w-full h-full border-0 bg-black"
          />
        )}
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};
