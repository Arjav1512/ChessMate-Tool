# ChessMate - Manual QA Testing Checklist

**Version:** 1.2.0
**Last Updated:** October 18, 2025
**Tester:** ___________________
**Date:** ___________________

---

## Pre-Testing Setup

- [ ] Clear browser cache and cookies
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS and Android)
- [ ] Check internet connection is stable
- [ ] Verify test account credentials work

---

## 1. Authentication Flow

### Sign Up

- [ ] **Email/Password Registration**
  - [ ] Can create account with valid email
  - [ ] Password must be minimum 6 characters
  - [ ] Name field is required
  - [ ] Error shown for duplicate email
  - [ ] Error shown for invalid email format
  - [ ] Success message displayed on completion

- [ ] **OAuth Sign Up**
  - [ ] Google OAuth button works
  - [ ] GitHub OAuth button works
  - [ ] Redirects back to app after auth
  - [ ] Profile created automatically
  - [ ] No errors in console

### Sign In

- [ ] **Email/Password Sign In**
  - [ ] Can log in with valid credentials
  - [ ] Error shown for wrong password
  - [ ] Error shown for non-existent email
  - [ ] Remember me functionality works
  - [ ] Form validation prevents empty submission

- [ ] **OAuth Sign In**
  - [ ] Google OAuth login works
  - [ ] GitHub OAuth login works
  - [ ] Existing users can sign in
  - [ ] Session persists after refresh

### Sign Out

- [ ] Sign out button works
  - [ ] User is logged out immediately
  - [ ] Redirected to login page
  - [ ] Cannot access protected routes
  - [ ] Session cleared from storage

---

## 2. Game Import

### Upload PGN File

- [ ] **File Upload**
  - [ ] Click to upload works
  - [ ] Drag and drop works
  - [ ] Only .pgn files accepted
  - [ ] Loading indicator shows during upload
  - [ ] Success toast appears on completion
  - [ ] Game appears in game list
  - [ ] File size validation works (if implemented)

- [ ] **Error Handling**
  - [ ] Empty file rejected
  - [ ] Invalid format rejected
  - [ ] Clear error messages shown
  - [ ] Suggestions provided for fixes

### Paste PGN Text

- [ ] **Text Input**
  - [ ] Textarea accepts PGN text
  - [ ] "Add Game" button works
  - [ ] Multiple games handled correctly
  - [ ] Success feedback shown
  - [ ] Game added to list immediately

- [ ] **Validation**
  - [ ] Empty input rejected
  - [ ] Invalid PGN format rejected
  - [ ] Headers parsed correctly
  - [ ] Moves parsed correctly
  - [ ] Comments and variations handled

---

## 3. Game Viewing

### Game List

- [ ] **Display**
  - [ ] All games shown in list
  - [ ] Player names visible
  - [ ] Game result visible
  - [ ] Date formatted correctly
  - [ ] Event name shown (if available)
  - [ ] List scrolls smoothly

- [ ] **Interaction**
  - [ ] Click game to view details
  - [ ] Selected game highlighted
  - [ ] Delete game works (if implemented)
  - [ ] Sort/filter works (if implemented)

### Chess Board

- [ ] **Display**
  - [ ] Board renders correctly
  - [ ] Pieces in correct positions
  - [ ] Colors contrast well
  - [ ] Coordinates visible (if enabled)
  - [ ] Responsive on mobile

- [ ] **Navigation**
  - [ ] Forward arrow (→) goes to next move
  - [ ] Back arrow (←) goes to previous move
  - [ ] Home key jumps to start
  - [ ] End key jumps to end
  - [ ] Click move in notation jumps to position

---

## 4. Chess Analysis

### Stockfish Integration

- [ ] **Analysis Display**
  - [ ] Evaluation shows in real-time
  - [ ] Evaluation gauge updates correctly
  - [ ] Centipawn values accurate
  - [ ] Mate-in-N detected correctly
  - [ ] Best move arrows appear

- [ ] **Performance**
  - [ ] Analysis doesn't block UI
  - [ ] Multiple analyses don't crash
  - [ ] Memory usage reasonable
  - [ ] Can cancel analysis

### Bulk Analysis

- [ ] **Process**
  - [ ] Can start bulk analysis
  - [ ] Progress bar updates in real-time
  - [ ] Current game shown during analysis
  - [ ] Can cancel bulk analysis
  - [ ] Completion notification shown

- [ ] **Results**
  - [ ] Accuracy calculated correctly
  - [ ] Mistakes count accurate
  - [ ] Blunders count accurate
  - [ ] Results saved to database
  - [ ] Can view analyzed games

---

## 5. AI Chess Mentor

### Question Interface

- [ ] **Input**
  - [ ] Text input box visible
  - [ ] Send button works
  - [ ] Enter key submits question
  - [ ] Loading indicator shows while processing
  - [ ] Character limit enforced (if any)

- [ ] **Responses**
  - [ ] AI response appears formatted
  - [ ] Markdown rendering works
  - [ ] Chess notation displayed correctly
  - [ ] Response is relevant to question
  - [ ] Response time < 10 seconds

### Rate Limiting

- [ ] **Limits Enforced**
  - [ ] 10 requests per minute limit works
  - [ ] Error message shown when limit hit
  - [ ] Retry-after header respected
  - [ ] Counter resets after 1 minute

---

## 6. Statistics Dashboard

### Display

- [ ] **Metrics Cards**
  - [ ] Average accuracy shown
  - [ ] Total games count correct
  - [ ] Mistakes count correct
  - [ ] Blunders count correct
  - [ ] Trend arrows show (if data available)

- [ ] **Charts**
  - [ ] Win/loss/draw breakdown correct
  - [ ] Color distribution correct
  - [ ] Recent games list populates
  - [ ] Data updates when new game analyzed

### Empty State

- [ ] **No Data**
  - [ ] Empty state message shown
  - [ ] Helpful guidance provided
  - [ ] No errors in console
  - [ ] Call-to-action button works

---

## 7. Progressive Web App (PWA)

### Installation

- [ ] **Install Prompt**
  - [ ] Install prompt appears (desktop)
  - [ ] "Add to Home Screen" works (mobile)
  - [ ] Icon appears on home screen
  - [ ] App opens in standalone mode

- [ ] **Offline**
  - [ ] App loads offline
  - [ ] Cached content accessible
  - [ ] Appropriate offline message shown
  - [ ] Data syncs when back online

### Performance

- [ ] **Loading**
  - [ ] Initial load < 3 seconds
  - [ ] Subsequent loads < 1 second
  - [ ] Service worker caching works
  - [ ] Assets load from cache

---

## 8. Accessibility (A11Y)

### Keyboard Navigation

- [ ] **Navigation**
  - [ ] Tab key navigates through elements
  - [ ] Focus visible on all interactive elements
  - [ ] Enter/Space activates buttons
  - [ ] Escape closes modals
  - [ ] Arrow keys work in game viewer

### Screen Reader

- [ ] **ARIA Labels**
  - [ ] All buttons have accessible names
  - [ ] Form inputs have labels
  - [ ] Images have alt text
  - [ ] Headings properly structured (H1, H2, H3)
  - [ ] Landmark regions identified

### Visual

- [ ] **Contrast**
  - [ ] Text readable on all backgrounds
  - [ ] Color contrast ratio ≥ 4.5:1
  - [ ] Important info not conveyed by color alone
  - [ ] Focus indicators high contrast

---

## 9. Internationalization (i18n)

### Language Switching

- [ ] **Language Selector**
  - [ ] Language dropdown works
  - [ ] English (en) loads correctly
  - [ ] Spanish (es) loads correctly
  - [ ] French (fr) loads correctly
  - [ ] German (de) loads correctly
  - [ ] Selection persists on refresh

- [ ] **Translations**
  - [ ] All UI text translated
  - [ ] No missing translation keys
  - [ ] Chess notation remains in English
  - [ ] Dates/times formatted per locale
  - [ ] RTL languages work (if supported)

---

## 10. Error Handling

### Network Errors

- [ ] **Connectivity**
  - [ ] Graceful offline handling
  - [ ] Clear error messages
  - [ ] Retry mechanism works
  - [ ] No app crash on network loss

### API Errors

- [ ] **Server Errors**
  - [ ] 500 errors handled gracefully
  - [ ] 401 unauthorized handled
  - [ ] 429 rate limit handled
  - [ ] Error sent to Sentry (if configured)

### User Errors

- [ ] **Validation**
  - [ ] Form validation messages clear
  - [ ] Helpful suggestions provided
  - [ ] No cryptic error codes
  - [ ] User can recover from errors

---

## 11. Performance

### Speed

- [ ] **Load Times**
  - [ ] First contentful paint < 1.5s
  - [ ] Time to interactive < 3.5s
  - [ ] No layout shifts (CLS)
  - [ ] Smooth 60fps animations

### Resource Usage

- [ ] **Efficiency**
  - [ ] Memory usage < 100MB
  - [ ] CPU usage reasonable
  - [ ] No memory leaks
  - [ ] Battery drain acceptable (mobile)

---

## 12. Mobile Responsiveness

### Layout

- [ ] **Responsive Design**
  - [ ] Works on iPhone (375px wide)
  - [ ] Works on Android phones
  - [ ] Works on tablets
  - [ ] No horizontal scrolling
  - [ ] Touch targets ≥ 44x44px

### Gestures

- [ ] **Touch**
  - [ ] Tap works on all buttons
  - [ ] Swipe works (if implemented)
  - [ ] Pinch zoom disabled on game board
  - [ ] Double-tap works as expected

---

## 13. Security

### Data Privacy

- [ ] **User Data**
  - [ ] Users only see own games
  - [ ] No cross-user data leakage
  - [ ] Passwords not visible
  - [ ] No API keys in console
  - [ ] HTTPS enforced

### Authentication

- [ ] **Session**
  - [ ] Session expires appropriately
  - [ ] Protected routes enforced
  - [ ] CSRF protection (if applicable)
  - [ ] XSS protection works

---

## 14. Browser Compatibility

### Desktop Browsers

- [ ] Chrome (latest) - Version: _____
- [ ] Firefox (latest) - Version: _____
- [ ] Safari (latest) - Version: _____
- [ ] Edge (latest) - Version: _____

### Mobile Browsers

- [ ] iOS Safari - Version: _____
- [ ] Android Chrome - Version: _____
- [ ] Samsung Internet - Version: _____

---

## 15. Edge Cases

### Unusual Inputs

- [ ] **Stress Testing**
  - [ ] Very long PGN (1000+ moves)
  - [ ] Many games (100+)
  - [ ] Rapid clicking doesn't break UI
  - [ ] Special characters handled
  - [ ] Unicode characters work

### Boundary Conditions

- [ ] **Limits**
  - [ ] Zero games handled
  - [ ] Maximum games handled
  - [ ] Empty database state
  - [ ] Full database state

---

## Issues Found

### Critical (Blocks Release)

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

### Major (Should Fix Before Release)

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

### Minor (Can Fix After Release)

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

---

## Sign-Off

### Test Results

- **Total Tests:** _____
- **Tests Passed:** _____
- **Tests Failed:** _____
- **Pass Rate:** _____%

### Recommendation

- [ ] ✅ **Approved for Production** - All critical tests passed
- [ ] ⚠️ **Approved with Conditions** - Minor issues noted
- [ ] ❌ **Not Approved** - Critical issues must be fixed

### Notes

_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Tester Signature:** ___________________
**Date:** ___________________
**Time:** ___________________

---

*This checklist should be completed for every major release and documented for compliance and quality assurance.*
