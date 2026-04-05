# MindBridge — AI Psychological Counsellor

A compassionate AI counselling companion powered by Cognitive Behavioral Therapy (CBT) techniques and Groq LLM. Built with FastAPI, ChromaDB, and vanilla JavaScript.

> **⚠️ Disclaimer**: MindBridge is an AI companion, not a substitute for professional therapy. If you are in crisis, please contact Kiran Mental Health Helpline: **1800-599-0019** (24/7, Free).

---

## Features

- **CBT-Grounded RAG Pipeline** — 10 comprehensive CBT technique documents embedded in ChromaDB, retrieved contextually for each conversation
- **Groq LLM Integration** — Fast inference using `llama-3.3-70b-versatile` with a carefully crafted therapeutic persona
- **Crisis Detection** — Tiered rule-based system that detects suicidal ideation, self-harm, and high distress, surfacing emergency helpline numbers
- **Dual Memory System** — Short-term (conversation context) + long-term (cross-session user insights via Groq summarization)
- **Voice Input** — Web Speech API integration for voice-to-text input (Chrome/Edge)
- **Mood Tracking** — Log mood on a 1-5 scale, view sparkline trends, get AI-generated insights
- **Guided Breathing** — Interactive box breathing exercise accessible from the sidebar
- **Dark/Light Mode** — User-toggled theme with calming color palettes
- **Fully Deployable** — Docker + Docker Compose ready

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your GROQ_API_KEY

# Ingest CBT documents into ChromaDB
python -m app.rag.ingest

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to localhost:8000)
npm run dev
```

### 3. Open http://localhost:5173

---

## Deployment (Docker)

```bash
# Create backend .env with your GROQ_API_KEY
cp backend/.env.example backend/.env
# Edit backend/.env

# Build and run
docker-compose up --build -d
```

The app will be available at `http://localhost` (port 80).

---

## Architecture

```
Frontend (Vite + Vanilla JS)                Backend (FastAPI)
┌────────────────────────┐    /api    ┌──────────────────────────┐
│  Login / Register      │ ───────── │  Auth (JWT + bcrypt)     │
│  Chat Interface        │           │  Chat Service            │
│  Voice Input (Speech)  │           │  ├─ Crisis Detection     │
│  Mood Tracker          │           │  ├─ RAG Pipeline         │
│  Breathing Exercise    │           │  ├─ Memory Manager       │
│  Dark/Light Mode       │           │  └─ Groq LLM            │
└────────────────────────┘           │  Mood Tracking           │
                                     └──────────────────────────┘
                                        │            │
                                     SQLite       ChromaDB
                                   (users,      (CBT embeddings)
                                    sessions,
                                    messages,
                                    moods)
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| Vector Store | ChromaDB with `all-MiniLM-L6-v2` embeddings |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Frontend | Vite, Vanilla JS, CSS Custom Properties |
| Voice | Web Speech API (Chrome/Edge) |
| Deployment | Docker, Docker Compose |

---

## Emergency Resources

| Helpline | Number | Region |
|----------|--------|--------|
| Kiran Mental Health Helpline | 1800-599-0019 | India (24/7, Free) |
| CHILDLINE India | 1098 | India (24/7) |
| NCW Helpline | 7827-170-170 | India |
| 988 Suicide & Crisis Lifeline | 988 | US (24/7) |
| Crisis Text Line | Text HOME to 741741 | International |

---

## License

This project is for educational purposes. Always encourage users to seek professional help.
