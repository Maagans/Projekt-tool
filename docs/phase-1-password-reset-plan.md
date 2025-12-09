# Fase 1: Password Reset med Microsoft Graph

> [!NOTE]
> **Faseopdeling:**
> - **Fase 1 (denne plan)**: Password reset + `auth_provider` felt
> - **Fase 2 (senere)**: Azure AD SSO login (følger ROADMAP.md)

Password reset for **lokale brugere** via email-link. Azure AD brugere guides til Microsofts password reset. Følger **3-layer arkitekturen** fra `Agents.md`.

## User Review Required

> [!IMPORTANT]
> **Azure App Registration**: Kræver `Mail.Send` permission + godkendelse i Azure AD.

> [!WARNING]
> **Afsender-email**: Konfigureres via `AZURE_MAIL_FROM` (shared mailbox eller service account).

---

## Proposed Changes

### Configuration

#### [MODIFY] backend/config/index.js

Tilføj miljøvariabler:
```javascript
AZURE_TENANT_ID: z.string().optional(),
AZURE_CLIENT_ID: z.string().optional(),
AZURE_CLIENT_SECRET: z.string().optional(),
AZURE_MAIL_FROM: z.string().email().optional(),
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),
FRONTEND_URL: z.string().url().optional(),
```

---

### Layer 3: Repository (SQL kun)

#### [NEW] backend/repositories/passwordResetRepository.js

```javascript
// Kun SQL - ingen business logic
export const createToken = async (client, { userId, tokenHash, expiresAt }) => { /* INSERT */ };
export const findValidToken = async (client, tokenHash) => { /* SELECT WHERE expires_at > NOW() AND used_at IS NULL */ };
export const markTokenUsed = async (client, tokenId) => { /* UPDATE used_at = NOW() */ };
export const deleteExpiredTokens = async (client) => { /* DELETE WHERE expires_at < NOW() */ };
```

#### [MODIFY] backend/repositories/usersRepository.js

Tilføj:
```javascript
export const updatePasswordHash = async (client, userId, passwordHash) => { /* UPDATE users SET password_hash */ };
```

---

### Layer 2: Service + Validators (Zod + business logic)

#### [NEW] backend/validators/passwordResetValidators.js

```javascript
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(256),
});
```

#### [NEW] backend/services/passwordResetService.js

```javascript
import * as passwordResetRepo from '../repositories/passwordResetRepository.js';
import * as usersRepo from '../repositories/usersRepository.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../validators/passwordResetValidators.js';
import { sendPasswordResetEmail } from '../utils/graphMailClient.js';

export const requestPasswordReset = async (payload) => {
  const { email } = forgotPasswordSchema.parse(payload);
  const user = await usersRepo.findByEmail(pool, email);
  if (!user) return { success: true };  // Security: don't reveal if email exists
  
  // Azure AD brugere kan ikke nulstille password her
  if (user.auth_provider === 'azure_ad') {
    return { 
      success: true, 
      isAzureAdUser: true,
      message: 'Brug Microsoft til at nulstille dit password.' 
    };
  }
  
  // Generate token, hash it, store in DB, send email
};

export const resetPassword = async (payload) => {
  const { token, password } = resetPasswordSchema.parse(payload);
  // Verify token, check auth_provider === 'local', update password hash, mark token used
};
```

---

### Layer 1: Controller/Route (HTTP kun)

#### [NEW] backend/controllers/passwordResetController.js

```javascript
import * as passwordResetService from '../services/passwordResetService.js';

// Ingen business logic - kun HTTP handling
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await passwordResetService.requestPasswordReset(req.body);
    res.json(result);
  } catch (error) { next(error); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await passwordResetService.resetPassword(req.body);
    res.json(result);
  } catch (error) { next(error); }
};
```

#### [NEW] backend/routes/passwordResetRoutes.js

```javascript
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController.js';

const router = Router();
const rateLimiter = rateLimit({ windowMs: 60_000, max: 5 });

router.post('/forgot-password', rateLimiter, forgotPassword);
router.post('/reset-password', rateLimiter, resetPassword);

export default router;
```

---

### Database Migrations

#### [NEW] backend/migrations/20251209000100_add_auth_provider.js

Tilføjer `auth_provider` felt til `users` for hybrid auth:
```javascript
export const up = (pgm) => {
  pgm.addColumn('users', {
    auth_provider: { type: 'text', notNull: true, default: 'local' },  // 'local' | 'azure_ad'
  });
  pgm.createIndex('users', 'auth_provider');
};
export const down = (pgm) => {
  pgm.dropColumn('users', 'auth_provider');
};
```

#### [NEW] backend/migrations/20251209000200_password_reset_tokens.js

```javascript
export const up = (pgm) => {
  pgm.createTable('password_reset_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'cascade' },
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('password_reset_tokens', ['user_id', 'token_hash']);
};
export const down = (pgm) => {
  pgm.dropTable('password_reset_tokens', { ifExists: true });
};
```

---

### Utility: Microsoft Graph Mail Client

#### [NEW] backend/utils/graphMailClient.js

```javascript
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { config } from '../config/index.js';

export const sendPasswordResetEmail = async (toEmail, resetLink) => {
  // Mock i development-mode
  if (config.nodeEnv === 'development' && !config.azure?.clientId) {
    console.log(`[DEV MOCK] Password reset email to ${toEmail}: ${resetLink}`);
    return;
  }
  // Authenticate and send via Graph API
};
```

**Dependencies**: `npm install @azure/identity @microsoft/microsoft-graph-client`

---

### Frontend Pages

#### [NEW] src/app/pages/auth/ForgotPasswordPage.tsx

Viser passende besked baseret på `isAzureAdUser`:
- **Lokal bruger**: "Vi har sendt dig en email med instruktioner."
- **Azure AD bruger**: "Du bruger Microsoft-login. [Nulstil via Microsoft →](https://account.live.com/password/reset)"

#### [NEW] src/app/pages/auth/ResetPasswordPage.tsx
#### [MODIFY] src/app/pages/auth/LoginPage.tsx — Tilføj "Glemt password?" link
#### [MODIFY] src/app/AppShell.tsx — Tilføj routes

---

## Verification Plan

### Automated Tests (TDD per Agents.md)

| Test fil | Formål |
|----------|--------|
| `tests/repositories/passwordResetRepository.test.js` | Test SQL queries isoleret |
| `tests/services/passwordResetService.test.js` | Mock repository, test business logic |
| `tests/api/passwordResetRoutes.test.js` | Integration test af endpoints |

```bash
npm test
```

### Manual Verification

1. Gå til login → klik "Glemt password?" → indtast email → bekræft succes-besked
2. Tjek email/console log → klik reset link → indtast nyt password
3. Log ind med det nye password
