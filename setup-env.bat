@echo off
REM ChessMate Environment Setup Script
REM This script helps you create your .env file from .env.example

echo ==========================================
echo ChessMate Environment Setup
echo ==========================================
echo.

REM Check if .env already exists
if exist ".env" (
    echo WARNING: .env file already exists!
    set /p "overwrite=Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo Setup cancelled. Keeping existing .env file.
        exit /b 0
    )
)

REM Check if .env.example exists
if not exist ".env.example" (
    echo ERROR: .env.example not found!
    exit /b 1
)

REM Copy .env.example to .env
copy ".env.example" ".env" >nul
echo [OK] Created .env file from .env.example
echo.

echo ==========================================
echo IMPORTANT: Configure Your Environment
echo ==========================================
echo.
echo Your .env file has been created with placeholder values.
echo You MUST update it with your actual credentials:
echo.
echo 1. Create a Supabase project at: https://supabase.com
echo 2. Get your credentials from: Settings -^> API
echo 3. Edit .env and replace these values:
echo    - VITE_SUPABASE_URL
echo    - VITE_SUPABASE_ANON_KEY
echo    - VITE_GEMINI_API_KEY
echo.
echo For detailed setup instructions, see:
echo - README.md (Setup Requirements section)
echo - .env file (includes checklist)
echo.
echo ==========================================
echo Run 'npm run dev' after configuration
echo ==========================================
echo.
pause
