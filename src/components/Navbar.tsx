import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, BookOpen, ScanLine, Plus, LogOut, ChevronUp, Settings } from 'lucide-react';
import { Profile } from '../types';
import { pocadexLogo } from '../lib/assets';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  profile?: Profile | null;
  onSignOut?: () => void;
  onAddCard?: () => void;
  onOpenSettings?: () => void;
}

const NAV_ITEMS = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'Collection', label: 'My Binder', icon: BookOpen },
  { id: 'Scan', label: 'Scan', icon: ScanLine },
] as const;

export default function Navbar({ currentPage, onPageChange, profile, onSignOut, onAddCard, onOpenSettings }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      const inDesktop = desktopMenuRef.current?.contains(t);
      const inMobile = mobileMenuRef.current?.contains(t);
      if (!inDesktop && !inMobile) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = profile?.nickname || profile?.username || 'You';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url && profile.avatar_url !== failedAvatarUrl
    ? profile.avatar_url
    : null;

  const renderAvatar = (className: string) =>
    avatarUrl ? (
      <img
        src={avatarUrl}
        alt="Avatar"
        className={`object-cover ${className}`}
        referrerPolicy="no-referrer"
        onError={() => setFailedAvatarUrl(avatarUrl)}
      />
    ) : (
      <div className={`bg-primary/15 flex items-center justify-center text-center text-primary font-black leading-none ${className}`}>
        <span className="block translate-y-0 text-sm leading-none">{avatarLetter}</span>
      </div>
    );

  const userMenu = (
    <>
      <button
        onClick={() => {
          onOpenSettings?.();
          setShowUserMenu(false);
        }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 text-sm font-semibold text-foreground/70 transition-colors"
      >
        <Settings size={15} /> Account settings
      </button>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-sm font-semibold text-red-500 transition-colors"
      >
        <LogOut size={15} /> Sign out
      </button>
    </>
  );

  return (
    <>
      {/* ── Desktop / iPad landscape sidebar ── */}
      <aside className="hidden xl:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-white/80 backdrop-blur-xl border-r border-gray-100 shadow-sm">

        {/* Logo */}
        <div
          className="px-5 pt-6 pb-3 shrink-0 cursor-pointer"
          onClick={() => onPageChange('Dashboard')}
        >
          <img src={pocadexLogo} alt="PocaDex" className="w-full h-auto" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto min-h-0">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 w-full text-left group ${
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-foreground/60 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Icon
                  size={17}
                  className={active ? '' : 'group-hover:-rotate-6 transition-transform duration-200'}
                />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Add button + profile */}
        <div className="p-4 shrink-0 border-t border-gray-100 space-y-2">
          <button
            onClick={onAddCard}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm border border-primary/20 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <Plus size={17} />
            Add New Card
          </button>

          <div className="relative" ref={desktopMenuRef}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                {renderAvatar('w-9 h-9 rounded-xl')}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                {profile?.username && (
                  <p className="text-xs text-foreground/40 truncate">@{profile.username}</p>
                )}
              </div>
              <ChevronUp
                size={14}
                className={`text-foreground/30 shrink-0 transition-transform duration-200 ${showUserMenu ? '' : 'rotate-180'}`}
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  {userMenu}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ── Mobile / tablet portrait top bar ── */}
      <div className="xl:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <img
            src={pocadexLogo}
            alt="PocaDex"
            className="h-12 w-auto cursor-pointer"
            onClick={() => onPageChange('Dashboard')}
          />
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-primary/40 transition-colors flex items-center justify-center"
            >
              {renderAvatar('w-10 h-10 rounded-2xl')}
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  {userMenu}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Horizontal scrolling nav */}
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                  active ? 'bg-primary text-white shadow-sm' : 'text-foreground/50 hover:text-primary'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
          <button
            onClick={onAddCard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0 ml-2"
          >
            <Plus size={13} />
            Add
          </button>
        </nav>
      </div>
    </>
  );
}
