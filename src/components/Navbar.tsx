/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X as CloseIcon, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export default function Navbar({ currentPage, onPageChange, isDark, onToggleDark }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = ['Dashboard', 'Collection', 'Groups', 'Trade Finder'];

  const handleNav = (page: string) => {
    onPageChange(page);
    setIsMenuOpen(false);
  };

  return (
    <nav className="h-16 md:h-20 bg-card border-b border-border shadow-sm flex items-center px-4 md:px-10 justify-between sticky top-0 z-[60]">
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
        <div className="flex items-center gap-1 bg-muted p-1.5 rounded-full border-2 border-card shadow-inner">
          {links.map((link) => (
            <button
              key={link}
              onClick={() => onPageChange(link)}
              className={`text-[11px] uppercase tracking-widest font-semibold px-6 py-2.5 rounded-full transition-all relative shrink-0 ${
                currentPage === link
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="relative z-10">{link}</span>
              {currentPage === link && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                  transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark mode toggle */}
        {onToggleDark && (
          <button
            onClick={onToggleDark}
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* Avatar placeholder */}
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent border-2 border-card shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-[10px] md:text-xs font-semibold text-accent-foreground">
          Me
        </div>

        {/* Burger */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
        >
          {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[64px] left-0 w-full bg-card border-b border-border shadow-xl md:hidden z-50 p-6 space-y-4"
          >
            {links.map((link) => (
              <button
                key={link}
                onClick={() => handleNav(link)}
                className={`w-full py-4 px-6 rounded-2xl text-sm font-semibold uppercase tracking-widest transition-all text-left ${
                  currentPage === link
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
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
