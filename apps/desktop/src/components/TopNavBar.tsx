import React, { useState, useRef, useEffect } from 'react';
import { Home, Tv, BookOpen, Clock, Heart, List, Settings, Puzzle, LogOut, ChevronDown, User, UserCircle } from 'lucide-react';
import clsx from 'clsx';
import WindowControls from './WindowControls';
import { AuthModal } from './AuthModal';
import { useAuthStore } from '../stores/authStore';
import type { Page } from '../types';
import sakeAnimeLogo from '../assets/SakeAnimeLogo.png';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';

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
  { icon: List, label: 'Lists' },
];

const menuItems: { icon: React.ElementType; label: string; action: string }[] = [
  { icon: Puzzle, label: 'Extensiones', action: 'Extensions' },
  { icon: Settings, label: 'Configuración', action: 'Settings' },
];

export const TopNavBar: React.FC<TopNavBarProps> = ({ activePage, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuthStore();

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

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const displayName = profile?.username ?? user?.email?.split('@')[0] ?? 'Invitado';

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 h-[56px] z-50 border-b border-white/6"
        style={{
          background: 'rgba(8, 11, 18, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitAppRegion: 'drag',
        } as any}
      >
        <div
          className="grid grid-cols-[auto_1fr_auto] items-center h-full px-6 gap-4"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            type="button"
            onClick={() => onNavigate('Home')}
            className="flex items-center gap-2.5 shrink-0 rounded-lg hover:opacity-90 transition-opacity"
          >
            <img
              src={sakeAnimeLogo}
              alt=""
              className="h-12 w-12 object-cover object-top rounded-md"
              draggable={false}
            />
            <span className="text-white font-semibold text-[16px] tracking-tight font-display">
              SakeAnime
            </span>
          </button>

          <div className="flex items-center justify-center gap-1">
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

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="relative flex items-center" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-white/5 transition-all duration-150"
                >
                  <UserAvatar
                    name={displayName}
                    avatarUrl={profile?.avatar_url}
                    size="sm"
                  />
                  <ChevronDown
                    size={14}
                    className={clsx(
                      'text-gray-400 transition-transform duration-200',
                      menuOpen && 'rotate-180'
                    )}
                  />
                </button>

                {menuOpen && (
                  <div
                    className="absolute top-[calc(100%+8px)] right-0 w-52 py-1.5 rounded-xl border border-white/8 shadow-2xl shadow-black/50"
                    style={{
                      background: 'rgba(14, 18, 27, 0.95)',
                      backdropFilter: 'blur(24px)',
                    }}
                  >
                    <div className="px-3.5 py-3 border-b border-white/6 mb-1 flex items-center gap-3">
                      <UserAvatar
                        name={displayName}
                        avatarUrl={profile?.avatar_url}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-white text-[13px] font-medium truncate">{displayName}</p>
                        <p className="text-gray-500 text-[11px] truncate">{user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setProfileOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <UserCircle size={15} className="text-gray-500" />
                      Mi perfil
                    </button>

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
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-gray-300 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                      >
                        <LogOut size={15} className="text-gray-500" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <User size={15} />
                Iniciar sesión
              </button>
            )}

            <WindowControls />
          </div>
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};
