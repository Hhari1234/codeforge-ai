# ⚡ CodeForge AI

**A production-grade AI Developer Platform** — not just another AI wrapper. CodeForge AI is a full-stack platform that helps developers throughout the entire software development lifecycle using multiple AI-powered tools, all from one unified dashboard.

![Architecture](https://img.shields.io/badge/React%20%2B%20TypeScript-Tailwind-blue) ![API](https://img.shields.io/badge/FastAPI-powered-green) ![AI](https://img.shields.io/badge/OpenRouter-LLM-orange) ![DB](https://img.shields.io/badge/SQLite%20%2B%20ChromaDB-Database-purple)

---

## 🎯 What It Does

Instead of one AI chatbot, CodeForge AI is a complete developer ecosystem. A developer can:

- 🚀 **Generate** a complete project
- 📦 **Upload** an existing repository
- 🔍 **Review** code
- 💡 **Explain** code
- 📄 **Generate** documentation
- 💬 **Chat** with repositories (RAG)
- 🐛 **Debug** errors
- 📖 **Generate** README files
- 🔐 **Manage** AI conversations
- 🌍 **Deploy** applications

Everything from one dashboard.

---

## 🏗 Architecture

```
React + TypeScript + Tailwind
            │
            ▼
        FastAPI Backend
            │
 ┌──────────┼───────────┐
 │          │           │
 ▼          ▼           ▼
OpenRouter  SQLite   ChromaDB
            │
        File Storage
```

The frontend **never** talks directly to the AI model. All AI requests go through the backend for security and flexibility.

---

## 📁 Project Structure

```
CodeForge-AI
│
├── frontend/          # React + TypeScript + Vite SPA
├── backend/           # FastAPI REST API
│   ├── api/routes/    # HTTP layer (thin)
│   ├── services/      # Business logic
│   ├── ai/            # AI modules (OpenRouter client)
│   ├── models/        # SQLAlchemy ORM
│   ├── schemas/       # Pydantic I/O shapes
│   ├── parsers/       # Repo ingestion, AST, GitHub clone
│   ├── database/      # Session & engine
│   └── core/          # Config & security
├── docker/            # Docker deployment files
└── render.yaml        # Render blueprint
```

---

## 🛠 Feature Modules

### ✅ Phase 1 — Foundation
FastAPI backend, React frontend, JWT auth, SQLite, SQLAlchemy, OpenRouter integration, Health API, Swagger, Axios client.

### ✅ Phase 2 — AI Project Generator
Generate complete projects from a prompt — folder structure, backend, frontend, APIs, database, README. ZIP download support.

### ✅ Phase 3 — Repository Analyzer
Upload an existing GitHub project (ZIP or URL). AI understands folder structure, framework, architecture, dependencies, and entry points.

### ✅ Phase 4 — Code Reviewer
Professional AI code review — bugs, performance, security, code smells, best practices — with ratings and downloadable reports.

### ✅ Phase 5 — README Generator
Automatically create professional README files with installation, usage, API, screenshots, license, and contribution sections.

### ✅ Phase 6 — Repository Chat (RAG)
Chat with any repository using ChromaDB, embeddings, LangGraph, and vector search. Ask "Where is login implemented?" or "Explain AuthService."

### ✅ Phase 7 — Code Explainer
Explain code in beginner-friendly language with line-by-line explanation, flowcharts, complexity, and algorithm analysis.

### ✅ Phase 8 — Bug Debugger
Paste a stack trace, console errors, or logs. AI returns root cause, explanation, solution, and fixed code with a health score.

### ✅ Phase 9 — API Documentation Generator
Auto-generate API documentation with framework detection (FastAPI, Express, Spring Boot, Flask), endpoint docs, examples, and export to Markdown / HTML / PDF.

### ⬜ Phase 10 — Production & Deployment *(Not Started)*
Docker, PostgreSQL, Alembic, CI/CD, monitoring, security hardening, and cloud deployment.

---

## 🚀 Getting Started

### Prerequisites

- **Backend:** Python 3.10+, `venv`
- **Frontend:** Node.js 18+, npm
- **API Key:** [OpenRouter](https://openrouter.ai) API key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env from example (never commit real secrets)
cp .env.example .env          # Windows: copy .env.example .env
# Set OPENROUTER_API_KEY, SECRET_KEY, DATABASE_URL

uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Set `VITE_API_URL` in `frontend/.env` (e.g. `http://localhost:8000/api`)

---

## 🔐 Authentication

CodeForge AI uses JWT-based authentication.

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/auth/register` | POST | Create an account |
| `/api/auth/login` | POST | Login, receive JWT |
| `/api/auth/me` | GET | Current user info |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password |

---

## 📡 API Overview

All feature endpoints are protected by JWT auth.

| Module | Base Path |
| ------ | --------- |
| Health | `/api/health` |
| AI Test | `/api/ai/test` |
| Project Generator | `/api/generations` |
| README Generator | `/api/readmes` |
| Code Explainer | `/api/explain` |
| Repository Analyzer | `/api/repositories` |
| Repository Chat | `/api/repositories/{id}/chat` |
| Code Reviewer | `/api/reviews` |
| Bug Debugger | `/api/debug` |
| API Docs Generator | `/api/documentation` |

Interactive docs available at `http://localhost:8000/docs`.

---

## 🧪 Testing & Verification

```bash
# Backend import check
cd backend && python -c "import app.main"

# Frontend type-check + build
cd frontend && npm run build

# Frontend lint
cd frontend && npm run lint
```

---

## 🐳 Docker (in progress)

A `docker-compose.yml`, multi-stage `Dockerfile`s, and a `render.yaml` blueprint are provided for containerized deployment (Phase 10).

```bash
docker-compose up --build
```

---

## 📄 License

Private / educational project. No license specified.

---

## 🙏 Acknowledgements

Built with **FastAPI**, **React**, **TypeScript**, **Tailwind CSS**, **OpenRouter**, **SQLite**, **ChromaDB**, and **LangGraph**.
