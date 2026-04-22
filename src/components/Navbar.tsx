/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X as CloseIcon, LogOut, User } from 'lucide-react';
import { Profile } from '../types';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  profile?: Profile | null;
  onSignOut?: () => void;
}

export default function Navbar({ currentPage, onPageChange, profile, onSignOut }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const links = ['Dashboard', 'Collection', 'Groups', 'Trade Finder'];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNav = (page: string) => {
    onPageChange(page);
    setIsMenuOpen(false);
  };

  return (
    <nav className="h-16 md:h-20 bg-white border-b border-gray-100 shadow-sm flex items-center px-4 md:px-10 justify-between sticky top-0 z-[60] font-sans">
      <div 
        className="cursor-pointer flex items-center shrink-0"
        onClick={() => handleNav('Dashboard')}
      >
        <img 
          src="/pocadex.png" 
          alt="Pocadex" 
          className="h-8 md:h-12 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-1 justify-center px-4">
        <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-full border-2 border-white shadow-inner">
          {links.map((link) => (
            <button
              key={link}
              onClick={() => onPageChange(link)}
              className={`text-[11px] uppercase tracking-widest font-black px-6 py-2.5 rounded-full transition-all relative shrink-0 ${
                currentPage === link ? 'text-white' : 'text-foreground/40 hover:text-foreground'
              }`}
            >
              <span className="relative z-10">{link}</span>
              {currentPage === link && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                  transition={{ 
                    type: 'spring', 
                    bounce: 0.1, 
                    duration: 0.4,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Profile avatar + dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(v => !v)}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black text-primary hover:ring-2 hover:ring-primary/40 transition-all"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span>{(profile?.nickname ?? profile?.username ?? 'Me').charAt(0).toUpperCase()}</span>
            )}
          </button>
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="font-black text-sm text-foreground truncate">{profile?.nickname ?? profile?.username ?? 'My Account'}</p>
                  <p className="text-xs text-foreground/40 font-medium truncate">@{profile?.username}</p>
                </div>
                <button
                  onClick={() => { setIsProfileOpen(false); onPageChange('Profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground/60 hover:bg-gray-50 hover:text-foreground transition-colors"
                >
                  <User size={14} /> My Profile
                </button>
                {onSignOut && (
                  <button
                    onClick={() => { setIsProfileOpen(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Burger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-foreground/40 hover:text-primary transition-colors"
        >
          {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[64px] left-0 w-full bg-white border-b border-gray-100 shadow-xl md:hidden z-50 p-6 space-y-4"
          >
            {links.map((link) => (
              <button
                key={link}
                onClick={() => handleNav(link)}
                className={`w-full py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-widest transition-all text-left ${
                  currentPage === link ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-foreground/40'
                }`}
              >
                {link}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
