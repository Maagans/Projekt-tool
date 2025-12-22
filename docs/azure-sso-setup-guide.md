# Azure AD SSO Konfiguration - Vejledning

## Baggrund
Vi har allerede konfigureret Azure App Registration til **fase 1 (Password Reset)** med Microsoft Graph API.  
Nu skal vi udvide opsætningen til også at understøtte **fase 2 (SSO Login)** via OpenID Connect.

---

## Hvad er allerede konfigureret (Fase 1)
✅ App Registration oprettet  
✅ Client ID og Client Secret genereret  
✅ Microsoft Graph API permissions (`Mail.Send`)  

---

## Hvad skal tilføjes (Fase 2 - SSO)

### 1. Tilføj Redirect URI

1. Gå til **Azure Portal** → **App registrations** → vælg din app
2. Klik på **Authentication** i venstre menu
3. Under **Platform configurations**, klik **Add a platform** → **Web**
4. Tilføj følgende Redirect URI:

**Produktion:**
```
https://dinapp.dk/api/auth/azure/callback
```

**Lokal udvikling (valgfrit):**
```
http://localhost:5173/api/auth/azure/callback
```

5. Klik **Configure**

---

### 2. Aktivér ID Tokens

På samme **Authentication** side:

1. Scroll ned til **Implicit grant and hybrid flows**
2. Sæt flueben ved: **ID tokens** (used for implicit and hybrid flows)
3. Klik **Save**

> **Note:** Vi bruger faktisk authorization code flow, men Azure kræver denne indstilling for at returnere ID tokens.

---

### 3. Verificer API Permissions

Gå til **API permissions** og sikr at følgende er tilføjet:

| Permission | Type | Status |
|------------|------|--------|
| `openid` | Delegated | ✅ Required for SSO |
| `profile` | Delegated | ✅ Required for user name |
| `email` | Delegated | ✅ Required for user email |
| `Mail.Send` | Application | *(allerede fra fase 1)* |

**Sådan tilføjes:**
1. Klik **Add a permission**
2. Vælg **Microsoft Graph**
3. Vælg **Delegated permissions**
4. Søg og tilføj: `openid`, `profile`, `email`
5. Klik **Add permissions**
6. Klik **Grant admin consent for [organisation]**

---

### 4. Token Configuration (Valgfrit men anbefalet)

For at sikre vi får de rigtige claims i ID token:

1. Gå til **Token configuration**
2. Klik **Add optional claim**
3. Vælg **ID** token type
4. Tilføj claims:
   - `email`
   - `upn` (User Principal Name)
5. Klik **Add**

---

## Oversigt over konfiguration

| Indstilling | Værdi |
|-------------|-------|
| Redirect URI (prod) | `https://dinapp.dk/api/auth/azure/callback` |
| Redirect URI (local) | `http://localhost:5173/api/auth/azure/callback` |
| Token type | ID tokens aktiveret |
| Scopes | `openid`, `profile`, `email` |

---

## Miljøvariabler til backend

Når ovenstående er konfigureret, skal backend have denne variabel:

```bash
AZURE_OIDC_REDIRECT_URI=https://dinapp.dk/api/auth/azure/callback
```

*(De eksisterende `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` genbruges fra fase 1)*

---

## Test af SSO

Når alt er konfigureret:
1. Gå til login-siden
2. Klik **"Log ind med Microsoft"**
3. Du skulle blive redirected til Microsoft login
4. Efter login redirectes du tilbage til appen og er logget ind

---

## Fejlfinding

| Fejl | Mulig årsag |
|------|-------------|
| `AADSTS50011: The reply URL does not match` | Redirect URI matcher ikke det konfigurerede i Azure |
| `AADSTS700016: Application not found` | Forkert Client ID eller Tenant ID |
| `Missing oid claim` | ID tokens ikke aktiveret |

---

## Kontakt
Ved spørgsmål, kontakt udviklingsholdet.
