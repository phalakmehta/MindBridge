/**
 * Crisis Alert Overlay
 * Full-screen overlay with emergency resources
 */

export function renderCrisisAlert(resources, tier = 1) {
  // Remove existing overlay if any
  const existing = document.getElementById('crisis-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'crisis-overlay';
  overlay.id = 'crisis-overlay';

  const title = tier === 1
    ? 'You Are Not Alone'
    : 'Support Is Available';

  const icon = tier === 1 ? '🤍' : '💙';

  overlay.innerHTML = `
    <div class="crisis-card">
      <div class="crisis-header">
        <span class="crisis-icon">${icon}</span>
        <h2 class="crisis-title">${title}</h2>
        <p class="crisis-message">
          ${tier === 1
            ? 'What you\'re going through sounds incredibly difficult. Real, trained people are available right now to listen and help — free, confidential, 24/7.'
            : 'It sounds like you\'re having a really tough time. These resources are here if you need someone to talk to — a real person who understands.'
          }
        </p>
      </div>

      <div class="crisis-resources">
        ${resources.map(r => `
          <div class="crisis-resource">
            <div class="crisis-resource-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div class="crisis-resource-info">
              <div class="crisis-resource-name">${r.name}</div>
              <div class="crisis-resource-number">${r.number}</div>
              <div class="crisis-resource-details">${r.details} · ${r.region}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="crisis-acknowledge-btn" id="crisis-acknowledge-btn">
        I've seen these resources — continue
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Must click to dismiss
  document.getElementById('crisis-acknowledge-btn').addEventListener('click', () => {
    overlay.style.animation = 'fadeIn 200ms ease reverse';
    setTimeout(() => overlay.remove(), 200);
  });
}
