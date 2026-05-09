import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import CurrentAffairs from './pages/CurrentAffairs';

function AppLayout() {
  const location = useLocation();
  const isQuizPage = location.pathname === '/quiz';

  /* ── Prevent browser zoom (desktop + mobile) ── */
  useEffect(() => {
    const blockWheel = (e) => { if (e.ctrlKey) e.preventDefault(); };
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', blockWheel, { passive: false });
    document.addEventListener('keydown', blockKeys);
    return () => {
      document.removeEventListener('wheel', blockWheel);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  return (
    <div className={`app-layout${isQuizPage ? ' quiz-active' : ''}`}>
      <Navbar />
      <main className={`app-main${isQuizPage ? ' quiz-main' : ''}`} style={isQuizPage ? { maxWidth: '100%' } : {}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/result" element={<Result />} />
          <Route path="/current-affairs" element={<CurrentAffairs />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

