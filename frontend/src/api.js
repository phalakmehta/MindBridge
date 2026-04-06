/**
 * API Client with JWT interceptor
 */

// In production (Vercel): set VITE_API_URL to your Render backend URL
// In local dev: falls back to '/api' which Vite proxy forwards to localhost:8000
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('mindbridge_token');
}

function setToken(token) {
  localStorage.setItem('mindbridge_token', token);
}

function clearToken() {
  localStorage.removeItem('mindbridge_token');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearToken();
      window.location.hash = '#/login';
      throw new Error('Session expired. Please log in again.');
    }

    if (response.status === 204) {
      return null;
    }

    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      if (!response.ok) {
        throw new Error(`Server Error (${response.status}): Unexpected response format.`);
      }
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.detail || `Something went wrong (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please ensure the backend is running.');
    }
    throw error;
  }
}

// ─── Auth API ─────────────────────────────────────────

export async function register(email, name, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function getMe() {
  return request('/auth/me');
}

export function logout() {
  clearToken();
  window.location.hash = '#/login';
}

export function isAuthenticated() {
  return !!getToken();
}

// ─── Chat API ─────────────────────────────────────────

export async function sendMessage(message, sessionId = null) {
  const body = { message };
  if (sessionId) body.session_id = sessionId;

  return request('/chat/message', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getSessions() {
  return request('/chat/sessions');
}

export async function getSessionMessages(sessionId) {
  return request(`/chat/sessions/${sessionId}/messages`);
}

export async function deleteSession(sessionId) {
  return request(`/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

// ─── Mood API ─────────────────────────────────────────

export async function logMood(score, note = null) {
  return request('/mood/log', {
    method: 'POST',
    body: JSON.stringify({ score, note }),
  });
}

export async function getMoodHistory(days = 30) {
  return request(`/mood/history?days=${days}`);
}

export async function getMoodInsights() {
  return request('/mood/insights');
}
