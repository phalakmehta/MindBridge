/**
 * Guided Breathing Exercise
 * Box breathing: 4s inhale, 4s hold, 6s exhale
 */

export function renderBreathingExercise(container) {
  container.innerHTML = `
    <button class="breathing-trigger" id="breathing-trigger">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      Guided Breathing
    </button>
  `;

  document.getElementById('breathing-trigger').addEventListener('click', openBreathingModal);
}


function openBreathingModal() {
  const modal = document.createElement('div');
  modal.className = 'breathing-modal';
  modal.id = 'breathing-modal';

  modal.innerHTML = `
    <div class="breathing-container">
      <div class="breathing-circle-wrapper">
        <div class="breathing-circle" id="breathing-circle"></div>
      </div>
      <div class="breathing-instruction" id="breathing-instruction">Get Ready</div>
      <div class="breathing-timer" id="breathing-timer">—</div>
      <button class="breathing-close-btn" id="breathing-close-btn">End Exercise</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('breathing-close-btn').addEventListener('click', () => {
    clearInterval(intervalId);
    clearTimeout(cycleTimeout);
    modal.remove();
  });

  // Start breathing cycle after 2s
  let intervalId = null;
  let cycleTimeout = null;

  setTimeout(() => {
    runBreathingCycle(modal);
  }, 1500);

  function runBreathingCycle(modal) {
    const circle = document.getElementById('breathing-circle');
    const instruction = document.getElementById('breathing-instruction');
    const timer = document.getElementById('breathing-timer');

    if (!circle || !modal.parentNode) return;

    // Phase 1: Inhale (4s)
    circle.className = 'breathing-circle inhale';
    instruction.textContent = 'Breathe In';
    countDown(timer, 4);

    cycleTimeout = setTimeout(() => {
      if (!modal.parentNode) return;

      // Phase 2: Hold (4s)
      circle.className = 'breathing-circle hold';
      instruction.textContent = 'Hold';
      countDown(timer, 4);

      cycleTimeout = setTimeout(() => {
        if (!modal.parentNode) return;

        // Phase 3: Exhale (6s)
        circle.className = 'breathing-circle exhale';
        instruction.textContent = 'Breathe Out';
        countDown(timer, 6);

        cycleTimeout = setTimeout(() => {
          if (modal.parentNode) {
            runBreathingCycle(modal);
          }
        }, 6000);
      }, 4000);
    }, 4000);
  }

  function countDown(element, seconds) {
    let remaining = seconds;
    element.textContent = remaining;

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      remaining--;
      if (remaining >= 0) {
        element.textContent = remaining || '—';
      } else {
        clearInterval(intervalId);
      }
    }, 1000);
  }
}
