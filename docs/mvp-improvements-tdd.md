# MVP Improvements - Technical Design Document

> **Status:** Draft  
> **Created:** 2025-12-15  
> **Context:** Improvements to implement while awaiting program lead MVP validation

---

## Overview

This document outlines six quality-of-life improvements prioritized by impact and complexity. These enhancements strengthen the platform's reliability, usability, and polish without modifying core business logic.

---

## 1. Database Backup Script 🔴 HIGH

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
- [ ] Run `npm run backup` manually
- [ ] Verify backup file is created and restorable
- [ ] Test cleanup of old backups

---

## 2. Session Timeout UI 🔴 HIGH

### Problem
Users get abruptly logged out without warning when session expires. No opportunity to extend session.

### Solution
Implement a session timeout warning modal that:
- Shows 2 minutes before session expires
- Allows user to extend session with one click
- Auto-logs out if user doesn't respond
- Shows remaining time countdown

### Implementation

#### Files to Create/Modify
- `[NEW] src/components/SessionTimeoutModal.tsx` - Warning modal
- `[MODIFY] src/app/AppShell.tsx` - Add timeout monitoring
- `[MODIFY] backend/authMiddleware.js` - Add session refresh endpoint

#### Technical Approach
```tsx
// SessionTimeoutModal.tsx
const SessionTimeoutModal = () => {
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [showModal, setShowModal] = useState(false);
  
  // Monitor session expiry from cookie or API
  // Show modal when < 2 min remaining
  // Call /api/auth/refresh to extend session
};
```

#### Verification
- [ ] Modal appears 2 min before timeout
- [ ] "Extend Session" button works
- [ ] Auto-logout occurs if ignored
- [ ] Countdown timer accurate

---

## 3. Error Boundary Improvements 🟡 MEDIUM

### Problem
Current error screens are generic. Users can't easily retry or navigate away after an error.

### Solution
Enhance error boundaries with:
- Contextual error messages based on error type
- "Try Again" button for retryable errors
- "Go to Dashboard" for fatal errors
- Optional error details for developers (in dev mode)

### Implementation

#### Files to Create/Modify
- `[MODIFY] src/components/GlobalErrorScreen.tsx` - Enhanced UI
- `[NEW] src/components/ErrorBoundary.tsx` - React error boundary wrapper
- `[MODIFY] src/app/AppShell.tsx` - Wrap routes with boundary

#### Technical Approach
```tsx
// ErrorBoundary.tsx
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };
}
```

#### Verification
- [ ] API errors show retry option
- [ ] Navigation errors show dashboard link
- [ ] Dev mode shows stack trace

---

## 4. Loading States (Skeleton Loaders) 🟡 MEDIUM

### Problem
Full-page spinners feel slow. Modern UX uses skeleton loaders that indicate content shape while loading.

### Solution
Create reusable skeleton components for:
- Table rows (projects, employees, audit logs)
- Cards (dashboard stats, project cards)
- Forms (project settings, report editor)

### Implementation

#### Files to Create/Modify
- `[NEW] src/components/skeletons/TableSkeleton.tsx`
- `[NEW] src/components/skeletons/CardSkeleton.tsx`
- `[NEW] src/components/skeletons/FormSkeleton.tsx`
- `[MODIFY] src/app/pages/dashboard/DashboardPage.tsx` - Use skeletons
- `[MODIFY] src/app/pages/admin/AuditLogPage.tsx` - Use table skeleton

#### Technical Approach
```tsx
// TableSkeleton.tsx
const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="animate-pulse">
    {Array(rows).fill(0).map((_, i) => (
      <div key={i} className="flex gap-4 py-3 border-b">
        {Array(cols).fill(0).map((_, j) => (
          <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
        ))}
      </div>
    ))}
  </div>
);
```

#### Verification
- [ ] Skeletons appear during data loading
- [ ] Smooth transition to real content
- [ ] Consistent styling across pages

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
| 1 | Database Backup Script | 2-3 hours |
| 2 | Session Timeout UI | 3-4 hours |
| 3 | Error Boundary Improvements | 2-3 hours |
| 4 | Loading States | 3-4 hours |
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
