/**
 * MindBridge — Main Entry Point
 * SPA Router + App Bootstrap
 */

import './styles/index.css';
import './styles/auth.css';
import './styles/chat.css';
import './styles/components.css';
import { isAuthenticated, getMe } from './api.js';
import { setUser } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderChat } from './pages/chat.js';

const app = document.getElementById('app');

// ─── Theme management ─────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('mindbridge_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mindbridge_theme', next);
  return next;
}

export function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// ─── Router ───────────────────────────────────────────

const routes = {
  '/login': renderLogin,
  '/register': renderRegister,
  '/chat': renderChat,
};

async function navigate() {
  const hash = window.location.hash.slice(1) || '/login';

  // Auth guard
  if (hash === '/chat' && !isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }

  // Redirect authenticated users away from auth pages
  if ((hash === '/login' || hash === '/register') && isAuthenticated()) {
    window.location.hash = '#/chat';
    return;
  }

  const renderFn = routes[hash];
  if (renderFn) {
    app.innerHTML = '';
    renderFn(app);
  } else {
    window.location.hash = '#/login';
  }
}

// ─── Bootstrap ────────────────────────────────────────

async function init() {
  initTheme();

  // Try to restore session
  if (isAuthenticated()) {
    try {
      const user = await getMe();
      setUser(user);
    } catch {
      // Token expired, will redirect to login
    }
  }

  window.addEventListener('hashchange', navigate);
  navigate();
}

init();
