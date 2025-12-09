# Azure App Registration Guide for Password Reset

## Formål
Opsætning af Azure App Registration så Projektværktøj kan sende password reset-emails via Microsoft Graph API.

---

## Step 1: Opret/brug eksisterende App Registration

1. Gå til [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. Klik **New registration** (eller brug eksisterende app)
3. Udfyld:
   - **Name**: `Projektværktøj` (eller tilsvarende)
   - **Supported account types**: "Accounts in this organizational directory only"
4. Klik **Register**

---

## Step 2: Tilføj API Permissions

1. I App Registration → **API permissions** → **Add a permission**
2. Vælg **Microsoft Graph** → **Application permissions**
3. Søg efter og tilføj: **`Mail.Send`**
4. Klik **Grant admin consent for [Organization]** ✅

> ⚠️ **Vigtigt**: Admin consent er påkrævet for application permissions.

---

## Step 3: Opret Client Secret

1. Gå til **Certificates & secrets** → **Client secrets** → **New client secret**
2. Vælg en udløbsperiode (f.eks. 24 months)
3. **Kopiér værdien med det samme** – den vises kun én gang!

---

## Step 4: Del disse værdier med udvikleren

| Variabel | Hvor findes den |
|----------|-----------------|
| `AZURE_TENANT_ID` | Overview → Directory (tenant) ID |
| `AZURE_CLIENT_ID` | Overview → Application (client) ID |
| `AZURE_CLIENT_SECRET` | Den værdi du lige kopierede |
| `AZURE_MAIL_FROM` | En email der kan sende (se nedenfor) |

---

## Step 5: Afsender-email (AZURE_MAIL_FROM)

Vælg én af disse muligheder:

### Option A: Shared Mailbox (anbefalet)
1. Opret en shared mailbox i Exchange/M365 Admin Center (f.eks. `noreply@gigtforeningen.dk`)
2. Ingen licens påkrævet

### Option B: Eksisterende bruger
- Brug en eksisterende mailbox (f.eks. `support@gigtforeningen.dk`)

> App'en sender emails *på vegne af* denne adresse via Graph API.

---

## Test
Når Christian har modtaget værdierne, kan han teste at flowet virker ved at:
1. Gå til login → klik "Glemt password?"
2. Indtaste sin email
3. Tjekke om emailen modtages

---

## Sikkerhed
- Client secret bør opbevares sikkert (ikke i repos)
- Overvej at rotere secret regelmæssigt
- Mail.Send giver adgang til at sende som den specificerede mailbox
