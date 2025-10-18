# ChessMate - AI-Powered Chess Analysis Tool

> **⚠️ CRITICAL NOTICE:** This application **REQUIRES** extensive third-party setup (Supabase + Google Gemini API + Edge Function deployment) and **WILL NOT WORK** without it. See [Setup Requirements](#-setup-requirements) for details.

A web application for analyzing chess games using Stockfish engine and AI-powered coaching.

---

## 🚨 Before You Start

### What Works Out of the Box
**NOTHING.** This is not a plug-and-play application.

### What You Need to Make It Work
1. **Supabase Account** (Free tier available) - Database & authentication
2. **Google Gemini API Key** (Paid service) - AI chat functionality
3. **Edge Function Deployment** - Complex setup via Supabase CLI
4. **Database Migrations** - PostgreSQL schema setup
5. **OAuth Configuration** (Optional) - For Google/GitHub login

**Estimated setup time:** 1-2 hours for experienced developers

---

## ✅ What Actually Works Right Now

| Feature | Status | Requirements |
|---------|--------|--------------|
| **PGN Import (Upload/Paste)** | ✅ Working | Supabase setup |
| **Interactive Chess Board** | ✅ Working | Supabase setup |
| **Stockfish Analysis** | ✅ Working | Browser only (no config) |
| **Move Navigation** | ✅ Working | Browser only |
| **Bulk Game Analysis** | ✅ Working | Supabase setup |
| **Email/Password Auth** | ⚙️ Config Required | Supabase + DB migration |
| **AI Chess Coach** | ⚙️ Config Required | Gemini API + Edge function |
| **Statistics Dashboard** | ⚙️ Config Required | Supabase + DB migration |
| **OAuth Login** | ⚙️ Config Required | OAuth provider setup |
| **Responsive Design** | ✅ Working | Browser only |
| **PWA Support** | ✅ Working | Browser only |

**Legend:**
- ✅ = Works (may still need Supabase for data persistence)
- ⚙️ = Requires complex third-party configuration
- ❌ = Not implemented

---

## 🚧 What's NOT Implemented (Roadmap)

See [ROADMAP.md](./ROADMAP.md) for planned features:
- Opening repertoire builder
- Puzzle training mode
- Tournament import APIs
- Mobile native apps
- Multiplayer analysis
- Video lessons
- Dark/Light theme toggle (only dark exists)
- Opening book integration
- Endgame tablebase

---

## 🚀 Setup Requirements

### Step 1: Prerequisites
```bash
# Required software
- Node.js 18+ and npm
- Git

# Required accounts (must sign up)
- Supabase account (https://supabase.com)
- Google AI Studio account (https://makersuite.google.com)
```

### Step 2: Clone and Install
```bash
git clone https://github.com/yourusername/chessmate.git
cd chessmate
npm install
```

### Step 3: Configure Supabase (MANDATORY)

1. Create new project at https://supabase.com/dashboard
2. Get credentials from: Settings → API
3. Copy `.env.example` to `.env`
4. Fill in Supabase URL and anon key:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=your_key_here
```

### Step 4: Setup Database (MANDATORY)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your_project_ref

# Apply database migrations
npx supabase db push
```

This creates 5 tables:
- `games` - Chess game storage
- `questions` - AI chat history
- `game_analysis_results` - Analysis data
- `user_statistics` - Aggregated stats
- `api_logs` - Request logging

### Step 5: Deploy Edge Function (REQUIRED for AI Chat)
```bash
# Set Gemini API key as Supabase secret (NOT in .env)
npx supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key

# Deploy the edge function
npx supabase functions deploy chess-mentor
```

### Step 6: Run the App
```bash
npm run dev
```

### Step 7: Optional OAuth Setup
Go to Supabase Dashboard → Authentication → Providers:
- Enable Google and/or GitHub
- Add Client ID and Secret from OAuth apps
- Configure redirect URLs

---

## 🔴 What Breaks Without Proper Setup

| Missing | What Breaks | Error You'll See |
|---------|-------------|------------------|
| No Supabase config | Everything | "Failed to initialize Supabase client" |
| No DB migration | Auth, games, stats | "relation does not exist" |
| No Gemini API | AI chat | "Failed to get response from chess mentor" |
| No edge function | AI chat | "Failed to invoke function" |
| No OAuth config | Social login | "Provider not configured" |

**Bottom line:** Without full setup, you can only view the UI. Nothing will save or work properly.

---

## 📊 Testing Status

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-11%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-basic-yellow)

### Current Test Coverage
- ✅ **11 Unit Tests** - PGN parser (passing)
- ✅ **21 E2E Tests** - Auth, import, accessibility (Playwright)
- ⚠️ **Manual QA** - 200+ test cases documented (not automated)
- ❌ **No integration tests** for AI chat or statistics

### Run Tests
```bash
npm test                    # Unit tests
npm run test:e2e           # E2E tests (requires config)
npm run lint               # Code quality
npm run typecheck          # TypeScript validation
```

---

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Chess:** chess.js + Stockfish.js (Web Worker)
- **Backend:** Supabase (PostgreSQL + Auth + Functions)
- **AI:** Google Gemini 2.0 Flash
- **Testing:** Vitest + Playwright

### Key Files
```
src/
├── components/
│   ├── AuthForm.tsx          # Login/signup
│   ├── ChessBoard.tsx        # Interactive board
│   ├── GameList.tsx          # Game library
│   ├── ChatInterface.tsx     # AI Q&A
│   ├── BulkAnalysis.tsx      # Batch analysis
│   └── StatsDashboard.tsx    # Progress tracking
├── lib/
│   ├── stockfish.ts          # Engine integration
│   ├── pgn.ts                # PGN parser
│   ├── gemini.ts             # AI integration
│   └── supabase.ts           # Database client
└── App.tsx

supabase/
├── functions/
│   └── chess-mentor/         # AI edge function
└── migrations/               # Database schema
```

---

## 📦 Deployment

### Build for Production
```bash
npm run build
# Output: dist/ directory
```

### Deploy To
- **Vercel** (Recommended for React)
- **Netlify**
- **AWS S3 + CloudFront**
- Any static hosting

### Environment Variables (Production)
Set these in your hosting platform:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_GEMINI_API_KEY=your_key
VITE_SENTRY_DSN=optional
```

**IMPORTANT:** Deploy edge function to Supabase separately.

---

## 🔒 Security

- ✅ Row Level Security (RLS) policies on all tables
- ✅ API keys in environment variables (not hardcoded)
- ✅ Gemini API key stored as Supabase secret
- ✅ No secrets committed to repo (.env in .gitignore)
- ✅ User data isolated (can only access own games)
- ✅ API rate limiting (10 requests/minute)

---

## 📝 Usage

### Import a Game
1. Click "Upload" or "Paste PGN"
2. Select .pgn file or paste text
3. Game appears in library

### Analyze with Stockfish
1. Select game from library
2. Click "Analyze Games"
3. Enable "Show Fishnet Analysis"
4. Navigate with arrow keys

### Ask AI Questions
1. Select game
2. Type question in chat
3. Examples:
   - "What should I have done in the opening?"
   - "Did I miss any tactics?"
   - "How can I improve?"

### View Statistics
1. Analyze multiple games first
2. Click "Statistics" button
3. View accuracy, mistakes, win rate

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/name`
3. Make changes
4. Run tests: `npm test && npm run lint`
5. Submit PR

**Please:**
- Don't promise features that aren't implemented
- Update FEATURES_STATUS.md when adding features
- Follow existing code style
- Add tests for new functionality

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- **Stockfish** - Chess engine
- **chess.js** - Chess logic library
- **Google Gemini** - AI model
- **Supabase** - Backend infrastructure

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/chessmate/issues)
- **Docs:** See [FEATURES_STATUS.md](./FEATURES_STATUS.md) for detailed feature status

---

## 📋 Quick Links

- [Features Status](./FEATURES_STATUS.md) - What's implemented vs planned
- [Roadmap](./ROADMAP.md) - Future features
- [Setup Guide](./.env.example) - Detailed configuration
- [Manual QA Checklist](./MANUAL_QA_CHECKLIST.md) - Testing guide

---

**Made with ♟️ by ChessMate Team**

**Current Version:** 1.2.0
**Status:** Requires extensive setup - not beginner-friendly
**Best For:** Developers comfortable with Supabase, edge functions, and PostgreSQL
