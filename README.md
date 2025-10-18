# ChessMate - AI-Powered Chess Analysis Tool

ChessMate is a modern, production-ready web application that helps chess players improve their game through AI-powered analysis, interactive board visualization, and personalized coaching insights.

![ChessMate Banner](https://via.placeholder.com/1200x300/1e293b/22c55e?text=ChessMate+-+Your+Personal+Chess+Mentor)

## 🎯 Features

### Core Functionality
- **PGN Import** - Upload chess games in standard PGN format (files or paste)
- **Interactive Board** - Navigate through games move-by-move with keyboard controls
- **Real Stockfish Analysis** - Actual chess engine (not random) via Web Worker with WASM
- **AI Chess Coach** - Ask questions and get personalized insights powered by Google Gemini
- **Bulk Analysis** - Analyze multiple games simultaneously with progress tracking
- **Game Management** - Organize and review your chess game library
- **OAuth Authentication** - Sign in with Google or GitHub for easy access
- **User Statistics Dashboard** - Track your progress with detailed analytics

### Analysis Features
- **Engine Evaluation** - Accurate position scoring with centipawn precision
- **Mate Detection** - Identifies forced checkmate sequences
- **Best Move Arrows** - Visual indicators for optimal moves
- **Multiple Variations** - See top 3 moves with evaluations (MultiPV)
- **Evaluation Gauge** - Visual representation of position advantage
- **Move-by-move Review** - Step through games with detailed analysis
- **Configurable Depth** - Analysis depth up to 20 ply

### Statistics & Progress
- **Average Accuracy** - Track your overall performance with trend indicators
- **Mistakes & Blunders** - See where you're losing points
- **Win/Loss/Draw Records** - Complete game outcome statistics
- **Color Distribution** - Performance as White vs Black
- **Recent Games** - Quick access to latest analyzed games
- **Historical Tracking** - Monitor improvement over time

### User Experience
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Dark/Light Themes** - Comfortable viewing in any environment
- **Keyboard Navigation** - Arrow keys for quick move traversal
- **Toast Notifications** - Clear, non-intrusive feedback messages
- **Progress Tracking** - Real-time progress bars for bulk analysis
- **Error Handling** - Helpful error messages with actionable suggestions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account for database and authentication
- Google Gemini API key for AI features

### Environment Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/chessmate.git
cd chessmate
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create a `.env` file in the project root:**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. **Set up the database:**

Apply the migration found in `supabase/migrations/` to create the required tables with RLS policies.

5. **Deploy Edge Functions:**

Set the `GEMINI_API_KEY` secret in your Supabase dashboard, then deploy:
```bash
npx supabase functions deploy chess-mentor
```

### Running Locally

**Development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## 📚 Usage Guide

### Importing Games

**File Upload:**
1. Click the "Upload" button in the game list
2. Select a `.pgn` file from your computer
3. The game will be automatically parsed and added to your library

**Paste PGN:**
1. Click the "Paste" button
2. Copy-paste PGN text directly into the modal
3. Click "Add Game" to import

**Sample PGN:**
```
[Event "Casual Game"]
[Site "Online"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0
```

### Analyzing Games

**Single Game Analysis:**
1. Select a game from your library
2. Click "Analyze Games" in the header
3. Choose "Board Analysis" mode
4. Enable "Show Fishnet Analysis" for real-time evaluation
5. Use arrow keys (←→) to navigate moves
6. Use Home/End keys to jump to start/end

**Bulk Analysis:**
1. Click "Analyze Games"
2. Switch to "Bulk Analysis" mode
3. Click "Start Analysis" to analyze all games
4. View accuracy, mistakes, and blunders for each game

### Asking Questions

1. Select a game from your library
2. Type your question in the chat interface
3. Get AI-powered insights about:
   - Opening choices and theory
   - Tactical opportunities
   - Strategic plans
   - Endgame technique
   - Specific positions or moves

**Example Questions:**
- "What should I have done differently in the opening?"
- "Did I miss any tactical opportunities?"
- "How can I improve my endgame technique?"
- "Explain the strategy in move 15"

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Design System
- **Chess Logic**: chess.js for move validation
- **Engine**: Stockfish.js (WebAssembly) in Web Worker
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Google Gemini 2.0 Flash
- **State Management**: React Context API

### Project Structure
```
chessmate/
├── src/
│   ├── components/          # React components
│   │   ├── AnalyzeGamesPage.tsx  # Analysis interface
│   │   ├── AuthForm.tsx          # Login/signup
│   │   ├── BulkAnalysis.tsx      # Batch analysis
│   │   ├── ChatInterface.tsx     # AI Q&A
│   │   ├── ChessBoard.tsx        # Interactive board
│   │   ├── GameList.tsx          # Game library
│   │   ├── GameViewer.tsx        # Move navigator
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx       # User auth state
│   │   └── ToastContext.tsx      # Notifications
│   ├── lib/                 # Core libraries
│   │   ├── gemini.ts            # AI integration
│   │   ├── pgn.ts               # PGN parser
│   │   ├── stockfish.ts         # Engine wrapper
│   │   └── supabase.ts          # Database client
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── style.css            # Global styles
├── supabase/
│   ├── functions/           # Edge functions
│   │   └── chess-mentor/    # AI chess coach
│   └── migrations/          # Database migrations
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Database Schema

```sql
-- Games table
games (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  pgn TEXT NOT NULL,
  white_player TEXT,
  black_player TEXT,
  result TEXT,
  date TEXT,
  event TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
)

-- Questions table (chat history)
questions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  game_id UUID REFERENCES games,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

## 🧪 Testing

ChessMate includes comprehensive testing infrastructure:

### Unit Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Code Quality
```bash
# Run ESLint
npm run lint

# TypeScript type checking
npm run typecheck

# Run all quality checks
npm run lint && npm run typecheck && npm test
```

### Test Coverage
Tests cover critical functionality:
- ✅ PGN parsing with various formats
- ✅ Error handling for invalid PGNs
- ✅ Edge cases (empty files, missing headers)
- ✅ Multiple game parsing
- ✅ Comment and variation handling

### CI/CD Pipeline
GitHub Actions automatically runs on every push:
1. **Lint & Type Check** - Validates code quality
2. **Unit Tests** - Runs test suite with coverage
3. **Security Audit** - Checks for vulnerabilities
4. **Build** - Ensures production build succeeds

See `.github/workflows/ci.yml` for full pipeline configuration.

## 📦 Deployment

### Production Build
```bash
npm run build
```

The build output is in the `dist/` directory, ready to deploy to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

### Environment Variables for Production
Ensure these are set in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Note:** `GEMINI_API_KEY` should be set as a Supabase secret for the edge function, not exposed to the client.

## 🔒 Security

ChessMate follows security best practices to protect your data:

### API Key Management
- ✅ **Never commit secrets** - All API keys in `.env` (which is `.gitignore`'d)
- ✅ **Server-side secrets** - `GEMINI_API_KEY` stored as Supabase Edge Function secret
- ✅ **Environment variables** - All keys loaded from environment, never hardcoded
- ✅ **Client-side exposure** - Only `VITE_*` prefixed variables exposed to browser
- ✅ **Validation** - Edge functions validate API keys before use

### Row Level Security (RLS)
All database tables enforce strict RLS policies:
- ✅ Users can **only** access their own games
- ✅ Users can **only** see their own statistics
- ✅ Users can **only** view their own chat history
- ✅ Authenticated users required for all operations
- ✅ No cross-user data leakage possible

### Data Validation
- ✅ PGN files validated before database insertion
- ✅ Chess moves verified by chess.js library
- ✅ User inputs sanitized in Edge Functions
- ✅ SQL injection prevented by Supabase client
- ✅ XSS protection via React's built-in escaping

### OAuth Security
- ✅ OAuth flows handled by Supabase (industry standard)
- ✅ PKCE (Proof Key for Code Exchange) enabled
- ✅ State parameter validation
- ✅ Secure redirect URLs

### Continuous Security
- ✅ `npm audit` runs in CI/CD pipeline
- ✅ Automated secret scanning in GitHub Actions
- ✅ Dependencies kept up-to-date
- ✅ TypeScript strict mode for type safety

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Write TypeScript with strict mode enabled
- Follow the existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Ensure all tests pass before submitting PR
- Keep commits focused and descriptive

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Stockfish** - Open-source chess engine
- **chess.js** - JavaScript chess library
- **Google Gemini** - AI model for coaching insights
- **Supabase** - Backend infrastructure
- **Lichess** - PGN format inspiration and standards

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/chessmate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/chessmate/discussions)

## 🗺️ Roadmap

- [ ] OAuth integration (Google, GitHub)
- [ ] User statistics dashboard
- [ ] Opening repertoire builder
- [ ] Puzzle training mode
- [ ] Tournament import (chess.com/lichess APIs)
- [ ] Mobile native apps
- [ ] Multiplayer analysis sessions
- [ ] Video lesson integration

---

Made with ♟️ by the ChessMate Team
