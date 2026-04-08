import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Aspirant<em>.</em>
      </Link>
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    </nav>
  );
}

export default Navbar;
