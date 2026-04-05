/**
 * Login Page
 */

import { login } from '../api.js';
import { setUser } from '../auth.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-logo">
              <img src="/favicon.svg" alt="MindBridge" class="auth-logo-icon" />
              <span class="auth-logo-text">MindBridge</span>
            </div>
            <p class="auth-subtitle">
              Welcome back. This is your safe space to think, feel, and grow.
            </p>
          </div>

          <div id="auth-error" class="auth-error" style="display: none;"></div>

          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label class="form-label" for="login-email">Email</label>
              <input
                type="email"
                id="login-email"
                class="form-input"
                placeholder="you@example.com"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                class="form-input"
                placeholder="Your password"
                required
                autocomplete="current-password"
              />
            </div>

            <button type="submit" class="auth-btn" id="login-btn">
              Sign In
            </button>
          </form>

          <p class="auth-footer">
            Don't have an account? <a href="#/register">Create one</a>
          </p>

          <p class="auth-disclaimer">
            MindBridge is an AI companion, not a substitute for professional therapy.
            If you're in crisis, please contact Kiran Helpline: 1800-599-0019
          </p>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('auth-error');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await login(email, password);
      setUser(data.user);
      window.location.hash = '#/chat';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}
