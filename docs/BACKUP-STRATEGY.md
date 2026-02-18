# Supabase Backup Strategy

This document outlines the backup strategy for the Zing Local Directory Sync database.

## Overview

| Environment | Project Name | Project Ref | Purpose |
|-------------|--------------|-------------|---------|
| **PRODUCTION** | zing-directory-app | `dtyrwmgoasbnyqrzfxng` | Live application data |
| **STAGING** | Zing Local Directory Backup | `olywxnqoaazoujgpdlyw` | Testing & backup |

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Production environment variables |
| `.env.staging` | Staging environment variables |

---

## Initial Staging Setup (One-Time)

The staging database needs to be set up with the production schema. Follow these steps:

### Step 1: Export Production Schema

```bash
# Run from project root
supabase db dump \
  --db-url "postgresql://postgres:YOUR_PROD_PASSWORD@db.dtyrwmgoasbnyqrzfxng.supabase.co:5432/postgres" \
  --schema public \
  -f production-schema.sql
```

### Step 2: Apply Schema to Staging

1. Open **Supabase Dashboard** for the staging project
2. Go to **SQL Editor**
3. Copy contents of `production-schema.sql`
4. Remove these lines (they cause errors):
   - Lines starting with `\restrict`
   - `ALTER ... OWNER TO` statements
   - `GRANT` and `REVOKE` statements
5. Run the SQL

### Step 3: Verify Tables Exist

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://olywxnqoaazoujgpdlyw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seXd4bnFvYWF6b3VqZ3BkbHl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY5NjYyMiwiZXhwIjoyMDgwMjcyNjIyfQ.U_53q5X_iQ11UekQEfP35JzjhKT-URyIyjkelrclcj0'
);
['contacts', 'clients', 'enriched_businesses'].forEach(async t => {
  const { error } = await supabase.from(t).select('*').limit(1);
  console.log(t + ': ' + (error ? 'MISSING' : 'OK'));
});
"
```

---

## Daily Backup Process

### Option A: Manual Backup (Recommended for small teams)

Export production data regularly:

```bash
# Export schema only
supabase db dump \
  --db-url "$DATABASE_URL" \
  --schema public \
  -f backups/schema-$(date +%Y%m%d).sql

# Export data only
supabase db dump \
  --db-url "$DATABASE_URL" \
  --data-only \
  -f backups/data-$(date +%Y%m%d).sql
```

### Option B: Automated Backup Script

Create `scripts/backup/backup-production.sh`:

```bash
#!/bin/bash
# Backup production database to local files

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="postgresql://postgres:PASSWORD@db.dtyrwmgoasbnyqrzfxng.supabase.co:5432/postgres"

mkdir -p $BACKUP_DIR

# Schema backup
supabase db dump --db-url "$DATABASE_URL" --schema public -f "$BACKUP_DIR/schema-$DATE.sql"

# Data backup
supabase db dump --db-url "$DATABASE_URL" --data-only -f "$BACKUP_DIR/data-$DATE.sql"

# Compress
gzip "$BACKUP_DIR/schema-$DATE.sql"
gzip "$BACKUP_DIR/data-$DATE.sql"

echo "Backup complete: $BACKUP_DIR/*-$DATE.sql.gz"
```

---

## Restore Process

### Restore to Staging

```bash
# 1. Reset staging database (optional - clears all data)
supabase db reset --db-url "postgresql://postgres:IPtq38ZfnYYTQe0K@db.olywxnqoaazoujgpdlyw.supabase.co:5432/postgres"

# 2. Apply schema
# Use Supabase Dashboard SQL Editor with the schema file

# 3. Apply data
# Use Supabase Dashboard SQL Editor with the data file
```

### Restore to Production (Emergency Only)

⚠️ **WARNING: This will overwrite production data!**

1. Pause all app traffic (set maintenance mode)
2. Take a final backup of current state
3. Apply backup schema and data
4. Verify data integrity
5. Resume traffic

---

## Environment Switching

### Switch App to Staging

```bash
# Backup production env
cp .env.local .env.local.backup

# Use staging
cp .env.staging .env.local

# Restart app
pnpm dev
```

### Switch Back to Production

```bash
# Restore production env
cp .env.local.backup .env.local

# Restart app
pnpm dev
```

---

## Supabase CLI Quick Reference

```bash
# Link to production
supabase link --project-ref dtyrwmgoasbnyqrzfxng --password "PASSWORD"

# Link to staging
supabase link --project-ref olywxnqoaazoujgpdlyw --password "PASSWORD"

# Check current link
cat supabase/.temp/project-ref

# List migrations
supabase migration list

# Push migrations
supabase db push

# Dump schema
supabase db dump --schema public -f schema.sql

# Dump data
supabase db dump --data-only -f data.sql
```

---

## Backup Schedule Recommendation

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full schema + data | Daily | 7 days |
| Schema only | After each migration | 30 days |
| Supabase auto-backup | Daily (automatic) | 7 days (Free) / 14 days (Pro) |

---

## Credentials Reference

### Production (`dtyrwmgoasbnyqrzfxng`)
- **URL**: `https://dtyrwmgoasbnyqrzfxng.supabase.co`
- **Password**: See `.env.local`
- **Service Role Key**: See `.env.local`

### Staging (`olywxnqoaazoujgpdlyw`)
- **URL**: `https://olywxnqoaazoujgpdlyw.supabase.co`
- **Password**: `IPtq38ZfnYYTQe0K`
- **Service Role Key**: See `.env.staging`

---

## Troubleshooting

### Migration Conflicts on Fresh Database

The migrations evolved over time and have dependencies. For a fresh database:

1. Mark problematic migrations as applied: `supabase migration repair <version> --status applied`
2. Or use the schema dump method described above

### "Table does not exist" Error

The database tables may not match migration tracking. Options:
1. Reset migration tracking and apply schema dump
2. Manually create missing tables via SQL Editor

### Cannot Connect to Database

1. Check password is correct
2. Verify project ref matches
3. Check network connectivity to Supabase

---

*Last updated: December 2025*
