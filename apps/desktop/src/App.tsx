import { useState } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { HomePage } from './pages/HomePage';
import { AnimePage } from './pages/AnimePage';
import { ExtensionsPage } from './pages/ExtensionsPage';
import { AnimeDetailPage } from './pages/AnimeDetailPage';
import { VideoPlayer } from './pages/VideoPlayer';
import { HistoryPage } from './pages/HistoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import type { Page } from './types';

type RouteState =
  | { name: Page }
  | { name: 'AnimeDetail'; url: string; providerId: string }
  | { name: 'VideoPlayer'; episodeUrl: string; providerId: string };

function App() {
  const [route, setRoute] = useState<RouteState>({ name: 'Home' });

  const handleNavigate = (page: Page) => {
    setRoute({ name: page });
  };

  const renderPage = () => {
    switch (route.name) {
      case 'Home':
        return <HomePage onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId })} />;
      case 'Anime':
        return <AnimePage onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId })} />;
      case 'Manga':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">📖</div>
            <p className="text-white font-medium">Manga</p>
            <p className="text-sm">Próximamente</p>
          </div>
        );
      case 'History':
        return <HistoryPage onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId })} />;
      case 'Favorites':
        return <FavoritesPage onAnimeSelect={(url, providerId) => setRoute({ name: 'AnimeDetail', url, providerId })} />;
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
            onBack={() => setRoute({ name: 'Anime' })}
            onPlayEpisode={(episodeUrl, providerId) => setRoute({ name: 'VideoPlayer', episodeUrl, providerId })}
          />
        );
      case 'VideoPlayer':
        return (
          <VideoPlayer
            episodeUrl={route.episodeUrl}
            providerId={route.providerId}
            onBack={() => setRoute({ name: 'Anime' })}
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
