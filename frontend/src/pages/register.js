/**
 * Register Page
 */

import { register } from '../api.js';
import { setUser } from '../auth.js';

export function renderRegister(container) {
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
              Start your journey towards better mental wellness. Let's begin.
            </p>
          </div>

          <div id="auth-error" class="auth-error" style="display: none;"></div>

          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label class="form-label" for="register-name">Your Name</label>
              <input
                type="text"
                id="register-name"
                class="form-input"
                placeholder="What should we call you?"
                required
                minlength="1"
                maxlength="100"
                autocomplete="name"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="register-email">Email</label>
              <input
                type="email"
                id="register-email"
                class="form-input"
                placeholder="you@example.com"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="register-password">Password</label>
              <input
                type="password"
                id="register-password"
                class="form-input"
                placeholder="At least 6 characters"
                required
                minlength="6"
                maxlength="128"
                autocomplete="new-password"
              />
            </div>

            <button type="submit" class="auth-btn" id="register-btn">
              Create Account
            </button>
          </form>

          <p class="auth-footer">
            Already have an account? <a href="#/login">Sign in</a>
          </p>

          <p class="auth-disclaimer">
            MindBridge is an AI companion, not a substitute for professional therapy.
            If you're in crisis, please contact Kiran Helpline: 1800-599-0019
          </p>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('register-form');
  const errorEl = document.getElementById('auth-error');
  const btn = document.getElementById('register-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const data = await register(email, name, password);
      setUser(data.user);
      window.location.hash = '#/chat';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}
