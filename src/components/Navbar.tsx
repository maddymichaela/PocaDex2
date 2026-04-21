/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X as CloseIcon } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = ['Dashboard', 'Collection', 'Groups', 'Trade Finder'];

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
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black text-primary">
          Me
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
