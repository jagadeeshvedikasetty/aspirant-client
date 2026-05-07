import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Aspirant<em>.</em>
      </Link>
      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'client-nav-link' + (isActive ? ' active' : '')}
        >
          Home
        </NavLink>
        <NavLink
          to="/current-affairs"
          className={({ isActive }) => 'client-nav-link' + (isActive ? ' active' : '')}
        >
          Current Affairs
        </NavLink>
      </div>
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    </nav>
  );
}

export default Navbar;
