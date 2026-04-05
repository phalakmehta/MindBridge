/**
 * Mood Picker Component
 * Elegant numbered scale (1-5) without emojis
 */

export function renderMoodPicker(container, onSubmit) {
  let selectedScore = null;

  container.innerHTML = `
    <div class="mood-picker">
      <div class="mood-picker-title">How are you feeling right now?</div>
      <div class="mood-picker-subtitle">Take a moment to check in with yourself</div>

      <div class="mood-options" id="mood-options">
        <button class="mood-option" data-score="1" title="Very Low">1</button>
        <button class="mood-option" data-score="2" title="Low">2</button>
        <button class="mood-option" data-score="3" title="Okay">3</button>
        <button class="mood-option" data-score="4" title="Good">4</button>
        <button class="mood-option" data-score="5" title="Great">5</button>
      </div>

      <div class="mood-label">
        <span>Not great</span>
        <span>Wonderful</span>
      </div>

      <input
        type="text"
        class="mood-note-input"
        id="mood-note"
        placeholder="Anything you'd like to note? (optional)"
        maxlength="200"
      />

      <button class="mood-submit-btn" id="mood-submit-btn" disabled>
        Log Mood
      </button>
    </div>
  `;

  const options = container.querySelectorAll('.mood-option');
  const submitBtn = container.querySelector('#mood-submit-btn');
  const noteInput = container.querySelector('#mood-note');

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedScore = parseInt(opt.getAttribute('data-score'));
      submitBtn.disabled = false;
    });
  });

  submitBtn.addEventListener('click', () => {
    if (selectedScore && onSubmit) {
      const note = noteInput.value.trim() || null;
      onSubmit(selectedScore, note);
    }
  });
}
