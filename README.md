# ChessMate - AI-Powered Chess Analysis & Mentor Tool

ChessMate is a **web-based chess improvement platform** that helps you **analyze games, understand mistakes and train smarter** using a combination of a chess engine (Stockfish) and AI style coaching UX.

It’s designed as a modern, production-ready React app with authentication, game analysis flows and a clean training interface.

---

## ✨ Core Features

- ♟️ **Game Analysis** — review games move-by-move with evaluations
- 📈 **Evaluation Gauge** — visualize advantage swings and positions
- 🧠 **AI Mentor / Chat Interface** — interactive coaching-style explanations
- 🗂️ **Bulk Analysis** — analyze multiple games in one workflow
- 🎯 **Training Modules** — practice and learn from common patterns
- 🔐 **Auth + User Accounts** (Supabase)
- ⚡ **Fast UI + Modern UX** (React + TypeScript + Tailwind)
- 🧪 **Testing Ready** (Vitest + Playwright)

---

## 🧱 Tech Stack

- **React 18 + TypeScript**
- **Vite**
- **Tailwind CSS**
- **Supabase** (auth + database)
- **Stockfish** (engine integration)
- **Vitest** (unit/integration tests)
- **Playwright** (E2E tests)
- **PWA support** (vite-plugin-pwa)

---

## 📁 Project Structure (high level)

```text
src/
  components/        # App screens + UI components (analysis, viewer, training, chat)
  context/           # Global state (auth, settings, analysis state)
  lib/               # Supabase + Stockfish helpers
  utils/             # Validation, formatting, performance helpers
  App.tsx            # App shell + routing
  main.tsx           # React entry point
supabase/            # DB migrations & Supabase config
```

---

## 🚀 Run Locally

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment variables
Copy the example file:

```bash
cp .env.example .env
```

Then set your Supabase credentials (Vite requires `VITE_` prefixes).

### 3) Start the dev server
```bash
npm run dev
```

---

## 🧪 Scripts

```bash
npm run dev         # Start development server
npm run build       # Production build
npm run preview     # Preview production build
npm run lint        # Run ESLint
npm run typecheck   # TypeScript typecheck
npm run test        # Run Vitest tests
npm run test:e2e    # Run Playwright E2E tests
```

---

## 🛠 Notes for Revamp

If you plan to rebuild ChessMate into a stronger v2, good upgrades include:

- Stronger PGN import/export and game library features
- Better analysis summaries (mistake classification, key moments, accuracy score)
- Opening explorer + repertoire training
- Personal training plans + spaced repetition
- Engine performance tuning (multi-threading, caching, analysis limits)
- Cleaner component architecture (feature folders + shared UI primitives)
