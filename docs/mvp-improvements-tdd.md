# MVP Improvements - Technical Design Document

> **Status:** In Progress  
> **Created:** 2025-12-15  
> **Updated:** 2025-12-16  
> **Context:** Improvements to implement while awaiting program lead MVP validation

---

## Overview

This document outlines six quality-of-life improvements prioritized by impact and complexity. These enhancements strengthen the platform's reliability, usability, and polish without modifying core business logic.

---

## 1. Database Backup Script 🔴 HIGH ✅ DONE

### Problem
No automated backup strategy for production database. Manual recovery would be time-consuming and error-prone.

### Solution
Create a scheduled backup script that:
- Dumps PostgreSQL database to timestamped files
- Compresses backups with gzip
- Retains last 7 daily + 4 weekly backups
- Logs backup status to console

### Implementation

#### Files to Create/Modify
- `[NEW] backend/scripts/backup-db.js` - Backup script
- `[MODIFY] package.json` - Add `backup` npm script

#### Technical Approach
```javascript
// backup-db.js pseudocode
import { execSync } from 'child_process';
import config from '../config/index.js';

const timestamp = new Date().toISOString().split('T')[0];
const filename = `backup-${timestamp}.sql.gz`;

execSync(`pg_dump ${config.databaseUrl} | gzip > ./backups/${filename}`);
// Cleanup old backups (keep 7 daily, 4 weekly)
```

#### Verification
- [x] Run `npm run backup` manually
- [x] Verify backup file is created and restorable
- [x] Test cleanup of old backups
- [x] Auto-detect pg_dump path for Task Scheduler

---

## 2. Session Timeout UI 🔴 HIGH ✅ DONE

### Problem
Users get abruptly logged out without warning when session expires. No opportunity to extend session.

### Solution
Implement a session timeout warning modal that:
- Shows 5 minutes before session expires
- Allows user to extend session with one click
- Auto-logs out if user doesn't respond
- Shows remaining time countdown

### Implementation

#### Files Created/Modified
- `[NEW] src/components/SessionTimeoutModal.tsx` - Warning modal with Danish UI
- `[NEW] src/hooks/useSessionTimeout.ts` - Session monitoring hook
- `[MODIFY] src/app/AppShell.tsx` - Add timeout monitoring
- `[MODIFY] src/api/authApi.ts` - Add refreshSession() method
- `[MODIFY] backend/routes/authRoutes.js` - Add /refresh endpoint
- `[MODIFY] backend/controllers/authController.js` - Add refreshSession controller
- `[MODIFY] backend/services/authService.js` - JWT expiry updated to 30m
- `[MODIFY] backend/utils/cookies.js` - Cookie maxAge updated to 30m

#### Verification
- [x] TypeScript type check passes
- [x] Auth middleware tests pass
- [x] Modal appears 5 min before timeout
- [x] "Forlæng session" button works
- [x] Auto-logout occurs if ignored
- [x] Countdown timer accurate

---

## 3. Error Boundary Improvements 🟡 MEDIUM ✅ DONE

### Problem
Current error screens are generic. Users can't easily retry or navigate away after an error.

### Solution
Enhance error boundaries with:
- Contextual error messages based on error type
- "Try Again" button for retryable errors
- "Go to Dashboard" for fatal errors
- Optional error details for developers (in dev mode)

### Implementation

#### Files Modified
- `[MODIFY] src/components/ui/ErrorBoundary.tsx` - Store and pass error + errorInfo to fallback
- `[MODIFY] src/app/components/GlobalErrorScreen.tsx` - Contextual messages, dev stack trace, Go to Dashboard
- `[MODIFY] src/app/AppShell.tsx` - Pass error context to fallback

#### Verification
- [x] TypeScript check passes
- [x] ESLint passes
- [x] Contextual error messages based on error type (network, auth, chunk loading, etc.)
- [x] "Gå til forsiden" button for navigation to dashboard
- [x] Dev mode shows expandable stack trace

---

## 4. Loading States (Skeleton Loaders) 🟡 MEDIUM ✅ DONE

### Problem
Full-page spinners feel slow. Modern UX uses skeleton loaders that indicate content shape while loading.

### Solution
Create reusable skeleton components for:
- Table rows (projects, employees, audit logs)
- Cards (dashboard stats, project cards)
- Dashboard layout

### Implementation

#### Files Created/Modified
- `[NEW] src/components/skeletons/TableSkeleton.tsx` - Configurable table skeleton
- `[NEW] src/components/skeletons/CardSkeleton.tsx` - Card layout skeleton
- `[NEW] src/components/skeletons/DashboardSkeleton.tsx` - Full dashboard skeleton
- `[NEW] src/components/skeletons/index.ts` - Barrel export
- `[MODIFY] src/app/pages/admin/AuditLogPage.tsx` - Uses TableSkeleton

#### Verification
- [x] TypeScript check passes
- [x] ESLint passes
- [x] Skeletons appear during data loading
- [x] Smooth pulse animation
- [x] Consistent styling

---

## 5. Keyboard Shortcuts 🟢 LOW

### Problem
Power users can't navigate efficiently without mouse. Common actions require clicking through UI.

### Solution
Implement keyboard shortcuts for:
- `Ctrl+S` / `Cmd+S` - Save current form/report
- `Escape` - Close active modal
- `Ctrl+/` - Show shortcuts help overlay
- `G D` - Go to Dashboard
- `G P` - Go to Projects

### Implementation

#### Files to Create/Modify
- `[NEW] src/hooks/useKeyboardShortcuts.ts` - Global shortcut handler
- `[NEW] src/components/ShortcutsHelpModal.tsx` - Help overlay
- `[MODIFY] src/app/AppShell.tsx` - Register global shortcuts
- `[MODIFY] Modal components` - Add Escape handler

#### Technical Approach
```tsx
// useKeyboardShortcuts.ts
const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.key}`;
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
};
```

#### Verification
- [ ] Ctrl+S saves active form
- [ ] Escape closes modals
- [ ] Ctrl+/ shows help
- [ ] Shortcuts work in inputs

---

## 6. Dark Mode Toggle 🟢 LOW

### Problem
No dark mode option. Users in low-light environments may prefer dark theme.

### Solution
Implement theme toggle that:
- Persists preference to localStorage
- Respects system preference by default
- Toggles via button in header
- Applies CSS custom properties for colors

### Implementation

#### Files to Create/Modify
- `[NEW] src/hooks/useTheme.ts` - Theme state management
- `[MODIFY] src/index.css` - Dark mode CSS variables
- `[MODIFY] src/components/AppHeader.tsx` - Theme toggle button
- `[MODIFY] index.html` - Prevent flash of wrong theme

#### Technical Approach
```tsx
// useTheme.ts
const useTheme = () => {
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('theme') || 
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return { theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
};
```

```css
/* index.css */
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
}

:root.dark {
  --bg-primary: #1a1a1a;
  --text-primary: #f5f5f5;
}
```

#### Verification
- [ ] Toggle button works
- [ ] Preference persists after reload
- [ ] All pages support dark mode
- [ ] No flash of light mode on load

---

## Implementation Order

| Phase | Task | Estimated Effort |
|-------|------|------------------|
| 1 | Database Backup Script | ✅ Complete |
| 2 | Session Timeout UI | ✅ Complete |
| 3 | Error Boundary Improvements | ✅ Complete |
| 4 | Loading States | ✅ Complete |
| 5 | Keyboard Shortcuts | 2-3 hours |
| 6 | Dark Mode Toggle | 4-5 hours |

**Total estimated effort:** ~18-22 hours

---

## Decision Points for User Review

> [!IMPORTANT]
> Please review these design choices:

1. **Backup storage location:** Local `./backups/` folder or external storage (S3, Azure Blob)?
2. **Session timeout duration:** Currently assuming 30 min session with 2 min warning. Correct?
3. **Dark mode scope:** Full dark mode for all components, or just main content areas?
4. **Keyboard shortcuts:** Any additional shortcuts you'd like beyond the suggested set?

---

## Next Steps

1. User approves this TDD
2. Create task.md with implementation checklist
3. Implement in priority order (Phase 1 → Phase 6)
4. Commit after each completed feature
