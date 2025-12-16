# Database Backup Setup Guide

## Manual Backup

Run a backup manually at any time:

```powershell
cd backend
npm run backup
```

## Automatic Backups with Windows Task Scheduler

To run backups automatically at 09:00 and 15:00 daily:

### Step 1: Create the first task (09:00)

1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task...**
3. Name: `Projekt-Tool Backup Morning`
4. Description: `Daily database backup at 09:00`
5. Click **Next**

#### Trigger
6. Select **Daily**
7. Start time: `09:00:00`
8. Click **Next**

#### Action
9. Select **Start a program**
10. Program/script: `npm`
11. Add arguments: `run backup`
12. Start in: `C:\Users\sekcsc\Documents\projekt-tool\Projekt-tool\backend`
13. Click **Next** then **Finish**

### Step 2: Create the second task (15:00)

Repeat the above steps with:
- Name: `Projekt-Tool Backup Afternoon`
- Start time: `15:00:00`

### Step 3: Verify tasks

1. In Task Scheduler, find your tasks under **Task Scheduler Library**
2. Right-click a task and select **Run** to test
3. Check `backend/backups/` folder for new backup files

## Backup Retention

- Maximum 14 backups are kept (7 days × 2 daily)
- Older backups are automatically deleted
- Backups are stored in `backend/backups/`
- Backup files are excluded from git via `.gitignore`

## Restoring from Backup

To restore a backup:

```powershell
# Stop the backend server first
# Then restore:
psql -U postgres -d projektvaerktoej < backup/backup-YYYY-MM-DD-HH-mm.sql
```

## Troubleshooting

**Backup fails with "pg_dump not found":**
- Ensure PostgreSQL bin folder is in your PATH
- Default location: `C:\Program Files\PostgreSQL\17\bin`

**Task doesn't run automatically:**
- Ensure Task Scheduler service is running
- Check task history for errors (right-click task → History)
- Verify the "Start in" path is correct
