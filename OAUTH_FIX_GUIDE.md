# Google OAuth Authentication Fix Guide

## Summary of Changes

I've enhanced the OAuth authentication system with improved error handling and diagnostic logging to help identify and resolve the Google sign-in issue.

### Files Modified

1. **src/lib/supabase.ts**

   - Added environment variable validation
   - Logs errors if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing

2. **src/contexts/AuthContext.tsx**

   - Enhanced `signInWithGoogle()` with try-catch error handling
   - Added detailed console logging for debugging
   - Included OAuth options: `access_type: 'offline'` and `prompt: 'consent'`
   - Same improvements applied to `signInWithGitHub()`

3. **src/components/AuthForm.tsx**
   - Improved `handleOAuthSignIn()` with better error messages
   - Added pattern matching for common OAuth errors
   - Enhanced user feedback with specific error descriptions

## Testing Steps

### 1. Check Environment Variables

First, ensure you have a `.env` file in the project root with valid credentials:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

To verify:

```bash
# Check if .env file exists
ls -la .env

# View environment variables (safely)
grep VITE_ .env
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Google OAuth

1. Open the application in your browser
2. **Open Browser DevTools** (F12 or Right-click → Inspect)
3. Go to the **Console** tab
4. Click the "Sign in with Google" button
5. Check the console for detailed logs:
   - "Attempting to sign in with google..."
   - Any error messages with specific details

### 4. Check Supabase Dashboard Configuration

If you see errors in the console, verify your Supabase OAuth setup:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the provider list
5. Ensure it's **enabled** and configured with:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### 5. Verify Redirect URLs

The OAuth redirect URL must match your application URL:

**In Supabase:**

- Go to **Authentication** → **URL Configuration**
- Add your site URL to **Redirect URLs**:
  - `http://localhost:5173` (for local development)
  - `https://your-production-domain.com` (for production)

**In Google Cloud Console:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`

## Common Error Patterns and Solutions

### Error: "Invalid provider"

**Cause:** Google OAuth is not enabled in Supabase  
**Solution:** Enable Google provider in Supabase Dashboard → Authentication → Providers

### Error: "redirect configuration error"

**Cause:** Redirect URL mismatch  
**Solution:** Add your site URL to both Supabase and Google Cloud Console redirect URIs

### Error: "Application configuration error"

**Cause:** Missing or invalid environment variables  
**Solution:** Create/update `.env` file with correct Supabase credentials

### Console shows: "Missing environment variable"

**Cause:** `.env` file missing or not loaded  
**Solution:**

1. Create `.env` file in project root
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart the dev server

### OAuth popup opens but fails immediately

**Cause:** Invalid Google OAuth credentials  
**Solution:** Verify Client ID/Secret in Supabase match Google Cloud Console

### OAuth succeeds but user not authenticated

**Cause:** Callback URL mismatch  
**Solution:** Ensure Supabase callback URL is in Google Cloud Console authorized URIs

## Diagnostic Checklist

Use this checklist to systematically diagnose the issue:

- [ ] `.env` file exists and contains valid credentials
- [ ] Dev server restarted after `.env` changes
- [ ] Browser console shows "Attempting to sign in with google..."
- [ ] No "Missing environment variable" errors in console
- [ ] Google provider is enabled in Supabase dashboard
- [ ] Google OAuth credentials (Client ID/Secret) are configured in Supabase
- [ ] Site URL added to Supabase redirect URLs
- [ ] Supabase callback URL added to Google Cloud Console authorized URIs
- [ ] OAuth popup opens when clicking sign-in button
- [ ] No CORS errors in browser console

## Next Steps

1. **Test the fix** using the steps above
2. **Check browser console** for detailed error messages
3. **Verify Supabase configuration** if errors persist
4. **Share console logs** if you need further assistance

The enhanced error handling will now provide much clearer feedback about what's failing, making it easier to pinpoint and fix the root cause.

## Additional Resources

- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com)
- [Supabase Dashboard](https://supabase.com/dashboard)
