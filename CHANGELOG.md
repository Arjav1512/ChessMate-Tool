# Changelog

All notable changes to ChessMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-17

### 🔒 Security Fixes
- **CRITICAL**: Removed hardcoded Gemini API key from edge function
- Moved all API keys to environment variables
- Edge function now reads `GEMINI_API_KEY` from Supabase secrets
- Added validation to ensure API key is configured before use
- Documented security best practices in README

### ✨ New Features
- **Real Stockfish Engine**: Replaced mock analysis with actual Stockfish.js integration
  - Uses WebAssembly-based Stockfish via Web Worker
  - Real chess position evaluation with centipawn scores
  - Mate detection and variation analysis
  - Configurable depth and multi-PV support
- **Enhanced Error Handling**: Complete PGN parser rewrite
  - Custom `PGNParseError` class with detailed error messages
  - Actionable suggestions for fixing parse errors
  - Multiple parsing strategies for edge cases
  - User-friendly toast notifications for all errors
- **Toast Notification System**: Replaced jarring browser alerts
  - Smooth slide-in animations
  - Auto-dismissing with manual close option
  - Success and error variants
  - Non-intrusive positioning
- **Comprehensive Documentation**:
  - Expanded README with setup instructions
  - Usage guide with sample PGN
  - Architecture overview
  - Contributing guidelines
  - Security documentation

### 🛠️ Improvements
- **Streamlined AI Prompts**: Reduced Gemini prompt from 80+ lines to ~20 lines
  - Removed verbose formatting instructions
  - Focus on essential context only
  - Faster response times
  - Lower token usage
- **Better PGN Error Messages**: Users now see exactly what went wrong
  - Empty content detection
  - Invalid format details
  - No moves found warnings
  - Corruption detection
- **Code Quality**:
  - Added comprehensive JSDoc comments
  - Removed all debug console.log statements
  - Improved TypeScript types
  - Better separation of concerns

### 🐛 Bug Fixes
- Fixed GameList auto-selection after upload
- Fixed modal z-index inconsistencies (now 2000 for paste, 1000 for analysis)
- Fixed responsive height for game list (adapts to viewport)
- Improved Stockfish worker initialization and error handling
- Fixed evaluation gauge parsing for numeric vs string values

### 🚀 Performance
- Stockfish analysis now runs in Web Worker (non-blocking)
- Optimized PGN parsing with multiple fallback strategies
- Reduced AI prompt size for faster responses
- Better memory management with worker lifecycle

### 📝 Documentation
- Added comprehensive README.md
- Created CHANGELOG.md
- Added GitHub Actions CI workflow
- Documented all environment variables
- Added sample PGN files in documentation

### 🏗️ Infrastructure
- GitHub Actions CI workflow for:
  - Linting (ESLint)
  - Type checking (TypeScript)
  - Production builds
  - Future: Unit tests
- Ready for production deployment

### ⚠️ Breaking Changes
- `parsePGN` now throws `PGNParseError` instead of generic Error
- Stockfish `analyzePosition` returns real analysis (not mock data)
- GameList now requires `useToast` context
- Edge function requires `GEMINI_API_KEY` environment variable

### 📦 Dependencies
- No new dependencies added (pure web APIs for Stockfish)
- All existing dependencies remain minimal and necessary

### 🔮 Known Issues
- OAuth social login not yet implemented (roadmap item)
- User statistics page pending (roadmap item)
- Test coverage incomplete (in progress)

### 🎯 Migration Guide

#### For Developers
If you're upgrading from a previous version:

1. **Update Environment Variables:**
   ```bash
   # In Supabase Dashboard, add secret:
   GEMINI_API_KEY=your_api_key

   # Redeploy edge function:
   npx supabase functions deploy chess-mentor
   ```

2. **Handle New Error Types:**
   ```typescript
   import { parsePGN, PGNParseError } from '../lib/pgn';

   try {
     const data = parsePGN(pgnText);
   } catch (error) {
     if (error instanceof PGNParseError) {
       // Show error.message and error.suggestion to user
     }
   }
   ```

3. **Update Toast Usage:**
   ```typescript
   import { useToast } from '../contexts/ToastContext';

   const { showToast } = useToast();
   showToast('Success message', 'success');
   showToast('Error message', 'error');
   ```

### 🙏 Contributors
- Development and refactoring by ChessMate Team
- Stockfish.js by the Stockfish project
- chess.js library maintainers
- Supabase team for infrastructure

---

## [0.1.0] - 2025-10-15

### Initial Release
- Basic PGN import functionality
- Simple game viewer with move navigation
- Mock Stockfish analysis
- Gemini AI integration for Q&A
- Supabase authentication
- Basic UI components
