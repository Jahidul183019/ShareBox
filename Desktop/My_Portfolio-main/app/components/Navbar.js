'use client';

import { useState, useEffect } from 'react';
import { FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi';
import './Navbar.css';

const NAV_LINKS = [
  { name: 'Home',     href: '#home'     },
  { name: 'About',    href: '#about'    },
  { name: 'Projects', href: '#projects' },
  { name: 'Contact',  href: '#contact'  },
];

export default function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [active, setActive]             = useState('home');
  const [menuOpen, setMenuOpen]         = useState(false);
  const [dark, setDark]                 = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = NAV_LINKS.map(l => l.href.slice(1));
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const { top, bottom } = el.getBoundingClientRect();
        if (top <= 120 && bottom >= 120) { setActive(id); break; }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setDark(d => {
      document.documentElement.setAttribute('data-theme', d ? 'light' : 'dark');
      return !d;
    });
  };

  return (
    <header>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <span className="navbar-logo" onClick={() => scrollTo('#home')}>&lt;JI /&gt;</span>

          {/* Desktop */}
          <div className="navbar-desktop">
            <ul className="nav-links">
              {NAV_LINKS.map(link => (
                <li key={link.name}>
                  <button
                    className={`nav-link-btn ${active === link.href.slice(1) ? 'active' : ''}`}
                    onClick={() => scrollTo(link.href)}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
            <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {dark ? <FiSun /> : <FiMoon />}
            </button>
          </div>

          {/* Mobile */}
          <div
            className={`navbar-mobile-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            role="button"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {NAV_LINKS.map(link => (
            <button
              key={link.name}
              className={`mobile-nav-btn ${active === link.href.slice(1) ? 'active' : ''}`}
              onClick={() => scrollTo(link.href)}
            >
              {link.name}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}