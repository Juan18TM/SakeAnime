import React, { useState, useRef, useEffect } from 'react';
import { Home, Tv, BookOpen, Clock, Heart, Settings, Puzzle, LogOut, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import WindowControls from './WindowControls';
import type { Page } from '../types';

interface TopNavBarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { icon: React.ElementType; label: Page }[] = [
  { icon: Home, label: 'Home' },
  { icon: Tv, label: 'Anime' },
  { icon: BookOpen, label: 'Manga' },
  { icon: Clock, label: 'History' },
  { icon: Heart, label: 'Favorites' },
];

const menuItems: { icon: React.ElementType; label: string; action: string }[] = [
  { icon: Puzzle, label: 'Extensiones', action: 'Extensions' },
  { icon: Settings, label: 'Configuración', action: 'Settings' },
];

export const TopNavBar: React.FC<TopNavBarProps> = ({ activePage, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleMenuAction = (action: string) => {
    setMenuOpen(false);
    onNavigate(action as Page);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 h-[56px] z-50 border-b border-white/6"
      style={{
        background: 'rgba(8, 11, 18, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitAppRegion: 'drag',
      } as any}
    >
      <div
        className="flex items-center h-full px-6"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-10 shrink-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-md shadow-primary/25">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">SakeAnime</span>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.label)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                activePage === item.label
                  ? 'bg-primary/12 text-primary'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon size={15} strokeWidth={activePage === item.label ? 2.2 : 1.8} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Profile Menu */}
        <div className="flex items-center shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-white/5 transition-all duration-150"
          >
            <img
              alt="Profile"
              className="w-7 h-7 rounded-md object-cover border border-white/10"
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=SakeAnime"
            />
            <ChevronDown
              size={14}
              className={clsx(
                'text-gray-400 transition-transform duration-200',
                menuOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute top-[52px] right-6 w-52 py-1.5 rounded-xl border border-white/8 shadow-2xl shadow-black/50"
              style={{
                background: 'rgba(14, 18, 27, 0.95)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* User header */}
              <div className="px-3.5 py-2.5 border-b border-white/6 mb-1">
                <p className="text-white text-[13px] font-medium">SakeAnime</p>
                <p className="text-gray-500 text-[11px]">Mi cuenta</p>
              </div>

              {/* Menu items */}
              {menuItems.map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleMenuAction(item.action)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <item.icon size={15} className="text-gray-500" />
                  {item.label}
                </button>
              ))}

              <div className="border-t border-white/6 mt-1 pt-1">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-gray-300 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                >
                  <LogOut size={15} className="text-gray-500" />
                  Salir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Window Controls */}
        <div className="flex items-center shrink-0 ml-3">
          <WindowControls />
        </div>
      </div>
    </nav>
  );
};
