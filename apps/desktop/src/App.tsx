import { useState } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { HomePage } from './pages/HomePage';
import { AnimePage } from './pages/AnimePage';
import { ExtensionsPage } from './pages/ExtensionsPage';
import { AnimeDetailPage } from './pages/AnimeDetailPage';
import { VideoPlayer } from './pages/VideoPlayer';
import { HistoryPage } from './pages/HistoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ListsPage } from './pages/ListsPage';
import type { Page } from './types';
import type { Episode } from './services/ExtensionRegistry';

type AnimeContext = { url: string; title: string; poster: string };

type RouteState =
  | { name: Page; searchQuery?: string }
  | { name: 'AnimeDetail'; url: string; providerId: string; backTo?: Page; searchQuery?: string }
  | {
      name: 'VideoPlayer';
      episodeUrl: string;
      providerId: string;
      anime: AnimeContext;
      episode: Pick<Episode, 'number' | 'title'>;
      backTo?: 'Home' | 'AnimeDetail';
      backUrl?: string;
      backProviderId?: string;
      backSearchQuery?: string;
    };

function App() {
  const [route, setRoute] = useState<RouteState>({ name: 'Home' });

  const handleNavigate = (page: Page) => {
    setRoute({ name: page });
  };

  const renderPage = () => {
    switch (route.name) {
      case 'Home':
        return (
          <HomePage
            onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId })}
            onPlayEpisode={(episodeUrl, providerId, anime, episode) =>
              setRoute({ name: 'VideoPlayer', episodeUrl, providerId, anime, episode, backTo: 'Home' })
            }
            onViewAll={() => setRoute({ name: 'Anime' })}
          />
        );
      case 'Anime':
        return (
          <AnimePage
            initialSearchQuery={'searchQuery' in route ? route.searchQuery : undefined}
            onAnimeSelect={(url, providerId, searchQuery) =>
              setRoute({ name: 'AnimeDetail', url, providerId, backTo: 'Anime', searchQuery })
            }
          />
        );
      case 'Manga':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">📖</div>
            <p className="text-white font-medium">Manga</p>
            <p className="text-sm">Próximamente</p>
          </div>
        );
      case 'History':
        return (
          <HistoryPage
            onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId, backTo: 'History' })}
            onPlayEpisode={(episodeUrl, providerId, anime, episode) =>
              setRoute({ name: 'VideoPlayer', episodeUrl, providerId, anime, episode, backTo: 'Home' })
            }
          />
        );
      case 'Favorites':
        return <FavoritesPage onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId, backTo: 'Favorites' })} />;
      case 'Lists':
        return <ListsPage onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId, backTo: 'Lists' })} />;
      case 'Extensions':
        return <ExtensionsPage />;
      case 'Settings':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">⚙️</div>
            <p className="text-white font-medium">Configuración</p>
            <p className="text-sm">Próximamente</p>
          </div>
        );
      case 'AnimeDetail':
        return (
          <AnimeDetailPage
            url={route.url}
            providerId={route.providerId}
            onBack={() => {
              if (route.backTo === 'Anime') {
                setRoute({ name: 'Anime', searchQuery: route.searchQuery });
              } else {
                setRoute({ name: 'Home' });
              }
            }}
            onPlayEpisode={(episode, providerId, anime) =>
              setRoute({
                name: 'VideoPlayer',
                episodeUrl: episode.url,
                providerId,
                anime,
                episode: { number: episode.number, title: episode.title },
                backTo: route.backTo === 'Anime' ? 'AnimeDetail' : 'Home',
                backUrl: route.url,
                backProviderId: route.providerId,
                backSearchQuery: route.searchQuery,
              })
            }
            onNavigateAnime={(animeUrl, animeProviderId) => setRoute({ name: 'AnimeDetail', url: animeUrl, providerId: animeProviderId, backTo: route.backTo, searchQuery: route.searchQuery })}
          />
        );
      case 'VideoPlayer':
        return (
          <VideoPlayer
            episodeUrl={route.episodeUrl}
            providerId={route.providerId}
            anime={route.anime}
            episode={route.episode}
            onBack={() => {
              if (route.backTo === 'Home') {
                setRoute({ name: 'Home' });
              } else if (route.backUrl && route.backProviderId) {
                setRoute({ name: 'AnimeDetail', url: route.backUrl, providerId: route.backProviderId, backTo: route.backTo === 'AnimeDetail' ? 'Anime' : undefined, searchQuery: route.backSearchQuery });
              } else {
                setRoute({ name: 'Home' });
              }
            }}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">🚧</div>
            <p className="text-white font-medium">Página no encontrada</p>
            <p className="text-sm">En construcción</p>
          </div>
        );
    }
  };

  if (route.name === 'VideoPlayer') {
    return (
      <div className="h-screen w-screen bg-black">
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <TopNavBar activePage={'name' in route && !('url' in route) ? route.name : 'Home'} onNavigate={handleNavigate} />
      <div className="flex-1 pt-[56px] flex flex-col min-h-screen overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
