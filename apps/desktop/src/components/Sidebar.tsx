import React from 'react';
import { Home, Tv, BookOpen, Library, Puzzle, Download, History, User, Settings } from 'lucide-react';
import clsx from 'clsx';

type Page = 'Home' | 'Anime' | 'Manga' | 'Library' | 'Extensions' | 'Downloads' | 'History' | 'Profile' | 'Settings';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { icon: React.ElementType; label: Page }[] = [
  { icon: Home, label: 'Home' },
  { icon: Tv, label: 'Anime' },
  { icon: BookOpen, label: 'Manga' },
  { icon: Library, label: 'Library' },
  { icon: Puzzle, label: 'Extensions' },
  { icon: Download, label: 'Downloads' },
  { icon: History, label: 'History' },
];

const bottomItems: { icon: React.ElementType; label: Page }[] = [
  { icon: User, label: 'Profile' },
  { icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside
      className="w-64 h-screen fixed left-0 top-0 z-40 flex flex-col border-r border-white/5"
      style={{ background: '#0B0F1A' }}
    >
      {/* Brand Logo */}
      <div className="h-[72px] flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SakeAnime</span>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        <p className="text-muted text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">Menu</p>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.label)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left',
              activePage === item.label
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <item.icon
              size={18}
              className={activePage === item.label ? 'text-primary' : ''}
            />
            {item.label}
            {activePage === item.label && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="p-3 border-t border-white/5 flex flex-col gap-1">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.label)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left',
              activePage === item.label
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <item.icon size={18} className={activePage === item.label ? 'text-primary' : ''} />
            {item.label}
            {activePage === item.label && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};
