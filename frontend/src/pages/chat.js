/**
 * Chat Page — Main Interface
 */

import {
  sendMessage,
  getSessions,
  getSessionMessages,
  deleteSession,
  logout,
  logMood,
  getMoodHistory,
} from '../api.js';
import { getUser, getUserInitials } from '../auth.js';
import { toggleTheme, isDarkMode } from '../main.js';
import { renderCrisisAlert } from '../components/crisisAlert.js';
import { renderMoodPicker } from '../components/moodPicker.js';
import { renderBreathingExercise } from '../components/breathingExercise.js';

let currentSessionId = null;
let messages = [];
let sessions = [];
let isLoading = false;

export function renderChat(container) {
  const user = getUser();
  const initials = getUserInitials();

  container.innerHTML = `
    <div class="chat-layout">
      <!-- Sidebar Overlay (mobile) -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <img src="/favicon.svg" alt="MindBridge" class="sidebar-logo" />
          <span class="sidebar-title">MindBridge</span>
        </div>

        <button class="new-chat-btn" id="new-chat-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Conversation
        </button>

        <div class="sessions-list" id="sessions-list">
          <!-- Sessions loaded dynamically -->
        </div>

        <!-- Breathing Exercise -->
        <div class="breathing-widget" id="breathing-widget"></div>

        <!-- Mood Sparkline -->
        <div class="sidebar-section" id="mood-section">
          <div class="sidebar-section-title">Mood Tracker</div>
          <div class="mood-sparkline" id="mood-sparkline">
            <span class="mood-sparkline-empty">Log moods to see trends</span>
          </div>
        </div>

        <!-- Theme Toggle -->
        <div class="theme-toggle">
          <span class="theme-toggle-label">Dark Mode</span>
          <div class="theme-switch ${isDarkMode() ? 'active' : ''}" id="theme-switch">
            <div class="theme-switch-knob"></div>
          </div>
        </div>

        <!-- User Info -->
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user?.name || 'User'}</div>
            <div class="sidebar-user-email">${user?.email || ''}</div>
          </div>
          <button class="logout-btn" id="logout-btn">Sign out</button>
        </div>
      </aside>

      <!-- Main Chat -->
      <main class="chat-main">
        <header class="chat-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <button class="mobile-menu-btn" id="mobile-menu-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 class="chat-header-title" id="chat-title">New Conversation</h1>
          </div>
          <span class="chat-header-disclaimer">AI Companion — Not a therapist</span>
        </header>

        <div class="messages-container" id="messages-container">
          ${renderWelcomeState(user)}
        </div>

        <div class="chat-input-container">
          <div class="chat-input-wrapper" id="input-wrapper">
            <textarea
              class="chat-textarea"
              id="chat-input"
              placeholder="Share what's on your mind..."
              rows="1"
            ></textarea>
            <button class="chat-btn voice-btn" id="voice-btn" title="Voice input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            <button class="chat-btn send-btn" id="send-btn" disabled title="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <div class="chat-input-hint">
            Press Enter to send · Shift+Enter for new line · Voice input available
          </div>
        </div>
      </main>
    </div>
  `;

  // Initialize
  setupEventListeners();
  loadSessions();
  renderBreathingExercise(document.getElementById('breathing-widget'));
  loadMoodSparkline();
}


function renderWelcomeState(user) {
  const name = user?.name?.split(' ')[0] || 'there';
  return `
    <div class="welcome-state">
      <img src="/favicon.svg" alt="MindBridge" class="welcome-icon" />
      <h2 class="welcome-title">Hello, ${name}</h2>
      <p class="welcome-subtitle">
        I'm here whenever you're ready to talk. No pressure, no judgment —
        just a space for you to explore your thoughts and feelings.
      </p>
      <div class="welcome-prompts">
        <button class="welcome-prompt-btn" data-prompt="I've been feeling really anxious lately and I'm not sure why.">
          I've been feeling anxious lately...
        </button>
        <button class="welcome-prompt-btn" data-prompt="I'm having trouble sleeping because my mind won't stop racing at night.">
          My mind won't stop racing...
        </button>
        <button class="welcome-prompt-btn" data-prompt="I feel like I'm stuck in a rut and can't motivate myself to do anything.">
          I feel stuck and unmotivated...
        </button>
        <button class="welcome-prompt-btn" data-prompt="I've been having a hard time with a relationship and need to talk about it.">
          I'm struggling with a relationship...
        </button>
      </div>
    </div>
  `;
}


function setupEventListeners() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const voiceBtn = document.getElementById('voice-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const themeSwitch = document.getElementById('theme-switch');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    sendBtn.disabled = !input.value.trim();
  });

  // Send on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim()) handleSend();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (input.value.trim()) handleSend();
  });

  // Voice input
  voiceBtn.addEventListener('click', handleVoiceInput);

  // New chat
  newChatBtn.addEventListener('click', () => {
    currentSessionId = null;
    messages = [];
    const container = document.getElementById('messages-container');
    container.innerHTML = renderWelcomeState(getUser());
    document.getElementById('chat-title').textContent = 'New Conversation';
    attachPromptListeners();
    closeMobileSidebar();
  });

  // Welcome prompts
  attachPromptListeners();

  // Logout
  logoutBtn.addEventListener('click', () => {
    logout();
  });

  // Theme toggle
  themeSwitch.addEventListener('click', () => {
    toggleTheme();
    themeSwitch.classList.toggle('active');
  });

  // Mobile sidebar
  mobileMenuBtn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    sidebarOverlay.classList.add('active');
  });

  sidebarOverlay.addEventListener('click', closeMobileSidebar);
}


function attachPromptListeners() {
  document.querySelectorAll('.welcome-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      document.getElementById('chat-input').value = prompt;
      document.getElementById('send-btn').disabled = false;
      handleSend();
    });
  });
}


function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}


// ─── Send Message ──────────────────────────────────────

async function handleSend() {
  if (isLoading) return;

  const input = document.getElementById('chat-input');
  const messageText = input.value.trim();
  if (!messageText) return;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('send-btn').disabled = true;

  // Clear welcome state
  const container = document.getElementById('messages-container');
  if (container.querySelector('.welcome-state')) {
    container.innerHTML = '';
  }

  // Show mood picker for first message in a new session
  if (!currentSessionId && !container.querySelector('.mood-picker')) {
    // Let it go — mood picker shown separately
  }

  // Add user message
  appendMessage('user', messageText);

  // Show typing indicator
  showTypingIndicator();
  isLoading = true;

  try {
    const response = await sendMessage(messageText, currentSessionId);

    hideTypingIndicator();

    // Update session
    if (!currentSessionId) {
      currentSessionId = response.session_id;
      loadSessions();

      // Show mood picker after first message
      showMoodPicker();
    }

    // Handle crisis
    if (response.crisis_detected && response.crisis_tier <= 2 && response.emergency_resources) {
      renderCrisisAlert(response.emergency_resources, response.crisis_tier);
    }

    // Add assistant message
    appendMessage('assistant', response.content, response.technique_used);

    // Update title
    document.getElementById('chat-title').textContent =
      sessions.find(s => s.id === currentSessionId)?.title || 'Conversation';

  } catch (err) {
    hideTypingIndicator();
    appendMessage('assistant', `I'm having trouble responding right now. Please try again. (${err.message})`);
  }

  isLoading = false;
}


function appendMessage(role, content, technique = null) {
  const container = document.getElementById('messages-container');
  const user = getUser();
  const initials = getUserInitials();

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;

  const avatarContent = role === 'user'
    ? initials
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

  let techniqueTag = '';
  if (technique && role === 'assistant') {
    techniqueTag = `<div class="message-technique">✦ ${technique}</div>`;
  }

  // Format content with basic paragraph handling
  const formattedContent = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  msgDiv.innerHTML = `
    <div class="message-avatar">${avatarContent}</div>
    <div>
      <div class="message-content"><p>${formattedContent}</p></div>
      ${techniqueTag}
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}


function showTypingIndicator() {
  const container = document.getElementById('messages-container');
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="message-avatar" style="background: linear-gradient(135deg, var(--clr-secondary), var(--clr-secondary-dark)); color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}


function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}


// ─── Voice Input ───────────────────────────────────────

let recognition = null;
let isRecording = false;

function handleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  const voiceBtn = document.getElementById('voice-btn');

  if (isRecording) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add('recording');
    voiceBtn.innerHTML = `
      <div class="voice-waveform">
        <div class="voice-bar"></div>
        <div class="voice-bar"></div>
        <div class="voice-bar"></div>
        <div class="voice-bar"></div>
        <div class="voice-bar"></div>
      </div>
    `;
  };

  recognition.onresult = (event) => {
    const input = document.getElementById('chat-input');
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    input.value = transcript;
    document.getElementById('send-btn').disabled = !transcript.trim();
  };

  recognition.onend = () => {
    isRecording = false;
    voiceBtn.classList.remove('recording');
    voiceBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isRecording = false;
    voiceBtn.classList.remove('recording');
  };

  recognition.start();
}


// ─── Sessions ──────────────────────────────────────────

async function loadSessions() {
  try {
    sessions = await getSessions();
    renderSessions();
  } catch (err) {
    console.error('Failed to load sessions:', err);
  }
}


function renderSessions() {
  const list = document.getElementById('sessions-list');
  if (!sessions.length) {
    list.innerHTML = `<p style="padding: 12px; color: var(--clr-text-muted); font-size: var(--fs-xs);">No conversations yet</p>`;
    return;
  }

  list.innerHTML = sessions.map(s => `
    <div class="session-item ${s.id === currentSessionId ? 'active' : ''}" data-id="${s.id}">
      <span class="session-item-title">${escapeHtml(s.title)}</span>
      <button class="session-item-delete" data-delete-id="${s.id}" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  // Click to load session
  list.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.session-item-delete')) return;
      const id = item.getAttribute('data-id');
      await loadSession(id);
      closeMobileSidebar();
    });
  });

  // Delete session
  list.querySelectorAll('.session-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-delete-id');
      if (confirm('Delete this conversation?')) {
        try {
          await deleteSession(id);
          if (id === currentSessionId) {
            currentSessionId = null;
            document.getElementById('messages-container').innerHTML = renderWelcomeState(getUser());
            attachPromptListeners();
            document.getElementById('chat-title').textContent = 'New Conversation';
          }
          await loadSessions();
        } catch (err) {
          console.error('Failed to delete session:', err);
        }
      }
    });
  });
}


async function loadSession(sessionId) {
  currentSessionId = sessionId;
  const session = sessions.find(s => s.id === sessionId);
  document.getElementById('chat-title').textContent = session?.title || 'Conversation';

  // Update active state
  renderSessions();

  // Load messages
  const container = document.getElementById('messages-container');
  container.innerHTML = '';

  try {
    const msgs = await getSessionMessages(sessionId);
    msgs.forEach(msg => {
      const technique = msg.metadata_json?.technique_used || null;
      appendMessage(msg.role, msg.content, msg.role === 'assistant' ? technique : null);
    });
  } catch (err) {
    container.innerHTML = `<p style="text-align: center; color: var(--clr-text-muted);">Failed to load messages.</p>`;
  }
}


// ─── Mood Picker ───────────────────────────────────────

function showMoodPicker() {
  const container = document.getElementById('messages-container');
  const pickerDiv = document.createElement('div');
  pickerDiv.id = 'mood-picker-container';
  // Insert before messages
  container.insertBefore(pickerDiv, container.firstChild);
  renderMoodPicker(pickerDiv, async (score, note) => {
    try {
      await logMood(score, note);
      pickerDiv.remove();
      loadMoodSparkline();
    } catch (err) {
      console.error('Failed to log mood:', err);
    }
  });
}


// ─── Mood Sparkline ────────────────────────────────────

async function loadMoodSparkline() {
  try {
    const history = await getMoodHistory(14);
    const container = document.getElementById('mood-sparkline');

    if (!history || history.length < 2) {
      container.innerHTML = '<span class="mood-sparkline-empty">Log moods to see trends</span>';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 40;
    container.innerHTML = '';
    container.appendChild(canvas);

    drawSparkline(canvas, history.map(e => e.score));
  } catch (err) {
    console.error('Failed to load mood sparkline:', err);
  }
}


function drawSparkline(canvas, data) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const padding = 4;

  const min = 1;
  const max = 5;
  const stepX = (w - padding * 2) / (data.length - 1);

  ctx.clearRect(0, 0, w, h);

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = '#6B9080';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  data.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = h - padding - ((val - min) / (max - min)) * (h - padding * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  // Draw dots
  data.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = h - padding - ((val - min) / (max - min)) * (h - padding * 2);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#6B9080';
    ctx.fill();
  });
}


// ─── Utilities ─────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
