/**
 * Mirror Production to Staging - Full Database Backup Script
 *
 * Uses Supabase CLI's pg_dump for reliable schema export that handles:
 * - ARRAY types (TEXT[], INTEGER[], etc.)
 * - ENUM types (USER-DEFINED)
 * - Sequences
 * - Views
 * - Indexes
 * - All constraints
 *
 * Usage: node scripts/backup/mirror-to-staging.js
 *
 * Prerequisites:
 * - Supabase CLI installed: npm install -g supabase
 * - pg package installed: pnpm add -D pg
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================
// DATABASE CONFIGURATION - HARD-CODED FOR SAFETY
// ============================================================

// PRODUCTION - READ ONLY! Never write to this!
const PRODUCTION = {
  name: 'PRODUCTION',
  ref: 'dtyrwmgoasbnyqrzfxng',
  host: 'db.dtyrwmgoasbnyqrzfxng.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'v40AttVOhh7FcQZW',
  ssl: { rejectUnauthorized: false },
  get url() {
    return `postgresql://${this.user}:${this.password}@${this.host}:${this.port}/${this.database}`;
  }
};

// STAGING - Write target for backups
const STAGING = {
  name: 'STAGING',
  ref: 'olywxnqoaazoujgpdlyw',
  host: 'db.olywxnqoaazoujgpdlyw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'IPtq38ZfnYYTQe0K',
  ssl: { rejectUnauthorized: false },
  get url() {
    return `postgresql://${this.user}:${this.password}@${this.host}:${this.port}/${this.database}`;
  }
};

// Batch size for data copying
// PostgreSQL has a limit of ~32,767 parameters per query
// For tables with many columns, we need smaller batches
const DEFAULT_BATCH_SIZE = 1000;
const SMALL_BATCH_SIZE = 100;  // For tables with 30+ columns

// Temp directory for schema dumps
const TEMP_DIR = path.join(__dirname, 'temp');

// ============================================================
// SAFETY CHECKS
// ============================================================

function verifySafety() {
  console.log('\n🔒 SAFETY VERIFICATION');
  console.log('═'.repeat(60));

  // Check 1: Verify production host is correct
  if (!PRODUCTION.host.includes('dtyrwmgoasbnyqrzfxng')) {
    console.error('❌ FATAL: Production host mismatch!');
    console.error('   Expected: dtyrwmgoasbnyqrzfxng');
    console.error('   Got:', PRODUCTION.host);
    process.exit(1);
  }
  console.log('✅ Production host verified: dtyrwmgoasbnyqrzfxng');

  // Check 2: Verify staging host is correct
  if (!STAGING.host.includes('olywxnqoaazoujgpdlyw')) {
    console.error('❌ FATAL: Staging host mismatch!');
    console.error('   Expected: olywxnqoaazoujgpdlyw');
    console.error('   Got:', STAGING.host);
    process.exit(1);
  }
  console.log('✅ Staging host verified: olywxnqoaazoujgpdlyw');

  // Check 3: Ensure we're not writing to production
  if (PRODUCTION.host === STAGING.host) {
    console.error('❌ FATAL: Production and Staging hosts are the same!');
    console.error('   This would overwrite production data!');
    process.exit(1);
  }
  console.log('✅ Production and Staging are different databases');

  console.log('\n🛡️  Safety checks passed - proceeding with mirror\n');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

async function getAllTables(client) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name);
}

async function getRowCount(client, tableName) {
  const result = await client.query(`SELECT COUNT(*) FROM public."${tableName}"`);
  return parseInt(result.rows[0].count);
}

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows.map(r => r.column_name);
}

function cleanSchemaSQL(sql) {
  // Remove ownership statements
  sql = sql.replace(/ALTER [^\n]+ OWNER TO [^;]+;/g, '');

  // Remove GRANT statements
  sql = sql.replace(/^GRANT [^\n]+$/gm, '');

  // Remove REVOKE statements
  sql = sql.replace(/^REVOKE [^\n]+$/gm, '');

  // Remove comments about roles/policies
  sql = sql.replace(/^--[^\n]*(Dumped|Role|Policy|Grant)[^\n]*$/gim, '');

  // Remove empty lines (multiple newlines)
  sql = sql.replace(/\n{3,}/g, '\n\n');

  return sql.trim();
}

// ============================================================
// MAIN MIRROR PROCESS
// ============================================================

async function mirrorToStaging() {
  const startTime = Date.now();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PRODUCTION → STAGING FULL MIRROR (pg_dump method)      ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Source: PRODUCTION (dtyrwmgoasbnyqrzfxng) - READ ONLY     ║');
  console.log('║  Target: STAGING (olywxnqoaazoujgpdlyw) - WRITE            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Safety first!
  verifySafety();

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const schemaFile = path.join(TEMP_DIR, 'schema.sql');

  // Connect to both databases
  console.log('📡 Connecting to databases...');
  const prodClient = new Client(PRODUCTION);
  const stagClient = new Client(STAGING);

  try {
    await prodClient.connect();
    console.log('   ✅ Connected to PRODUCTION (read-only)');

    await stagClient.connect();
    console.log('   ✅ Connected to STAGING (write target)');

    // ─────────────────────────────────────────────────────────
    // PHASE 1: Get table inventory from production
    // ─────────────────────────────────────────────────────────
    console.log('\n📋 PHASE 1: Discovering objects...');
    console.log('─'.repeat(60));

    const prodTables = await getAllTables(prodClient);
    console.log(`   Found ${prodTables.length} tables in production`);

    // Get views count
    const viewsResult = await prodClient.query(`
      SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'
    `);
    const viewCount = parseInt(viewsResult.rows[0].count);
    console.log(`   Found ${viewCount} views in production`);

    // Get sequences count
    const seqResult = await prodClient.query(`
      SELECT COUNT(*) FROM information_schema.sequences WHERE sequence_schema = 'public'
    `);
    const seqCount = parseInt(seqResult.rows[0].count);
    console.log(`   Found ${seqCount} sequences in production`);

    // Get enum types count
    const enumResult = await prodClient.query(`
      SELECT COUNT(DISTINCT t.typname)
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
    `);
    const enumCount = parseInt(enumResult.rows[0].count);
    console.log(`   Found ${enumCount} enum types in production`);

    // Get row counts for each table
    const tableStats = [];
    for (const table of prodTables) {
      const count = await getRowCount(prodClient, table);
      tableStats.push({ table, count });
    }
    const totalRows = tableStats.reduce((sum, t) => sum + t.count, 0);
    console.log(`   Total rows to copy: ${totalRows.toLocaleString()}`);

    // ─────────────────────────────────────────────────────────
    // PHASE 2: Export schema using Supabase CLI
    // ─────────────────────────────────────────────────────────
    console.log('\n📤 PHASE 2: Exporting schema from production...');
    console.log('─'.repeat(60));

    try {
      console.log('   Running: supabase db dump --schema public...');

      // Use supabase db dump to export schema (schema only, no data)
      const dumpCmd = `supabase db dump --db-url "${PRODUCTION.url}" -f "${schemaFile}"`;
      execSync(dumpCmd, { stdio: 'pipe', encoding: 'utf8' });

      console.log('   ✅ Schema exported successfully');

      // Read and clean the schema
      let schemaSQL = fs.readFileSync(schemaFile, 'utf8');
      const originalSize = schemaSQL.length;

      schemaSQL = cleanSchemaSQL(schemaSQL);
      const cleanedSize = schemaSQL.length;

      console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);
      console.log(`   Cleaned size: ${(cleanedSize / 1024).toFixed(1)} KB`);

      // Save cleaned schema
      fs.writeFileSync(schemaFile, schemaSQL);
      console.log('   ✅ Schema cleaned (removed OWNER/GRANT statements)');

    } catch (error) {
      console.error('   ❌ Supabase CLI dump failed:', error.message);
      console.log('\n   Falling back to manual schema export...');

      // Fallback: manual export for critical types
      await manualSchemaExport(prodClient, schemaFile);
    }

    // ─────────────────────────────────────────────────────────
    // PHASE 3: Clean staging database
    // ─────────────────────────────────────────────────────────
    console.log('\n🗑️  PHASE 3: Cleaning staging database...');
    console.log('─'.repeat(60));

    // Drop all views first (they depend on tables)
    const stagViews = await stagClient.query(`
      SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    `);
    for (const row of stagViews.rows) {
      await stagClient.query(`DROP VIEW IF EXISTS public."${row.table_name}" CASCADE`);
      console.log(`   • Dropped view: ${row.table_name}`);
    }

    // Drop all tables
    const stagTables = await getAllTables(stagClient);
    for (const table of stagTables) {
      await stagClient.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
      console.log(`   • Dropped table: ${table}`);
    }

    // Drop all sequences
    const stagSeqs = await stagClient.query(`
      SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    `);
    for (const row of stagSeqs.rows) {
      await stagClient.query(`DROP SEQUENCE IF EXISTS public."${row.sequence_name}" CASCADE`);
      console.log(`   • Dropped sequence: ${row.sequence_name}`);
    }

    // Drop all enum types
    const stagEnums = await stagClient.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `);
    for (const row of stagEnums.rows) {
      await stagClient.query(`DROP TYPE IF EXISTS public."${row.typname}" CASCADE`);
      console.log(`   • Dropped enum: ${row.typname}`);
    }

    console.log('   ✅ Staging database cleaned');

    // ─────────────────────────────────────────────────────────
    // PHASE 4: Apply schema to staging
    // ─────────────────────────────────────────────────────────
    console.log('\n🏗️  PHASE 4: Applying schema to staging...');
    console.log('─'.repeat(60));

    const schemaSQL = fs.readFileSync(schemaFile, 'utf8');

    // Split into statements and execute one by one for better error handling
    // This is a simple split - pg_dump statements end with ;
    const statements = schemaSQL
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (const stmt of statements) {
      try {
        await stagClient.query(stmt + ';');
        successCount++;
      } catch (err) {
        // Log error but continue
        if (!err.message.includes('already exists') &&
            !err.message.includes('does not exist')) {
          console.log(`   ⚠️ Error: ${err.message.substring(0, 60)}...`);
          errorCount++;
        }
      }
    }

    console.log(`   ✅ Schema applied: ${successCount} succeeded, ${errorCount} errors`);

    // Verify tables were created
    const newStagTables = await getAllTables(stagClient);
    console.log(`   Tables in staging: ${newStagTables.length}`);

    // ─────────────────────────────────────────────────────────
    // PHASE 5: Copy data table by table
    // ─────────────────────────────────────────────────────────
    console.log('\n📦 PHASE 5: Copying data...');
    console.log('─'.repeat(60));

    // Disable foreign key checks for the data copy
    // This is essential because user_id references auth.users which we don't copy
    console.log('   🔓 Disabling foreign key constraints...');
    await stagClient.query('SET session_replication_role = replica');

    let totalCopied = 0;

    for (const { table, count } of tableStats) {
      if (count === 0) {
        console.log(`   ⏭️  Skipping ${table} (empty)`);
        continue;
      }

      // Check if table exists in staging
      if (!newStagTables.includes(table)) {
        console.log(`   ❌ Skipping ${table} (not created in staging)`);
        continue;
      }

      // Get column names
      const columns = await getTableColumns(prodClient, table);
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      // Choose batch size based on column count (avoid PostgreSQL parameter limit)
      const BATCH_SIZE = columns.length > 30 ? SMALL_BATCH_SIZE : DEFAULT_BATCH_SIZE;

      console.log(`\n   📥 Copying ${table} (${count.toLocaleString()} rows, ${columns.length} columns, batch=${BATCH_SIZE})...`);

      // Copy in batches
      let copied = 0;
      let offset = 0;

      while (offset < count) {
        // Fetch batch from production
        const batchResult = await prodClient.query(
          `SELECT * FROM public."${table}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
        );

        if (batchResult.rows.length === 0) break;

        // Build multi-row INSERT for better performance
        const rows = batchResult.rows;
        const valueSets = [];
        const allValues = [];
        let paramIndex = 1;

        for (const row of rows) {
          const placeholders = columns.map(() => `$${paramIndex++}`);
          valueSets.push(`(${placeholders.join(', ')})`);
          columns.forEach(col => allValues.push(row[col]));
        }

        try {
          const insertSQL = `INSERT INTO public."${table}" (${columnNames}) VALUES ${valueSets.join(', ')} ON CONFLICT DO NOTHING`;
          await stagClient.query(insertSQL, allValues);
          copied += rows.length;
        } catch (err) {
          // Batch insert failed - log the error and fall back to individual inserts
          console.log(`\n      ⚠️ Batch insert failed: ${err.message.substring(0, 100)}`);
          console.log(`      Falling back to individual inserts...`);

          let batchCopied = 0;
          let batchErrors = 0;
          let lastError = null;

          for (const row of rows) {
            const values = columns.map(c => row[c]);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            try {
              await stagClient.query(
                `INSERT INTO public."${table}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                values
              );
              copied++;
              batchCopied++;
            } catch (insertErr) {
              batchErrors++;
              lastError = insertErr.message;
              // Continue trying other rows
            }
          }

          if (batchErrors > 0) {
            console.log(`      Individual insert results: ${batchCopied} succeeded, ${batchErrors} failed`);
            console.log(`      Last error: ${lastError?.substring(0, 100)}`);
          }
        }

        offset += BATCH_SIZE;

        // Progress update
        const percent = Math.round((copied / count) * 100);
        process.stdout.write(`      Progress: ${copied.toLocaleString()}/${count.toLocaleString()} (${percent}%)\r`);
      }

      console.log(`      ✅ Copied ${copied.toLocaleString()} rows                    `);
      totalCopied += copied;
    }

    // Re-enable foreign key constraints after data copy
    console.log('\n   🔒 Re-enabling foreign key constraints...');
    await stagClient.query('SET session_replication_role = DEFAULT');

    // ─────────────────────────────────────────────────────────
    // PHASE 6: Verification
    // ─────────────────────────────────────────────────────────
    console.log('\n✔️  PHASE 6: Verifying mirror...');
    console.log('─'.repeat(60));

    let allMatch = true;
    console.log('\n   TABLE                     | PROD      | STAGING   | STATUS');
    console.log('   ' + '─'.repeat(56));

    for (const table of prodTables) {
      const prodCount = await getRowCount(prodClient, table);
      let stagCount = 0;
      let status = '';

      try {
        stagCount = await getRowCount(stagClient, table);
        const match = prodCount === stagCount;
        if (!match) allMatch = false;
        status = match ? '✅ MATCH' : '⚠️ DIFF';
      } catch (e) {
        stagCount = -1;
        allMatch = false;
        status = '❌ MISSING';
      }

      console.log(`   ${table.padEnd(25)} | ${prodCount.toString().padEnd(9)} | ${(stagCount === -1 ? 'N/A' : stagCount.toString()).padEnd(9)} | ${status}`);
    }

    // Check views
    console.log('\n   VIEWS:');
    const prodViews = await prodClient.query(`
      SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    `);
    const stagViewsCheck = await stagClient.query(`
      SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    `);
    const stagViewNames = stagViewsCheck.rows.map(r => r.table_name);

    for (const row of prodViews.rows) {
      const exists = stagViewNames.includes(row.table_name);
      if (!exists) allMatch = false;
      console.log(`   ${row.table_name.padEnd(25)} | ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    // ─────────────────────────────────────────────────────────
    // FINAL REPORT
    // ─────────────────────────────────────────────────────────
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    console.log('\n' + '═'.repeat(60));
    console.log('📊 MIRROR COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Tables mirrored: ${newStagTables.length}/${prodTables.length}`);
    console.log(`   Rows copied: ${totalCopied.toLocaleString()}`);
    console.log(`   Duration: ${minutes}m ${seconds}s`);
    console.log(`   Status: ${allMatch ? '✅ SUCCESS - Full mirror!' : '⚠️ PARTIAL - Some differences'}`);
    console.log('═'.repeat(60));

    // Cleanup temp files
    if (fs.existsSync(schemaFile)) {
      fs.unlinkSync(schemaFile);
    }
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmdirSync(TEMP_DIR);
    }

    if (allMatch) {
      console.log('\n🎉 Staging is now a complete mirror of production!');
    } else {
      console.log('\n⚠️ Some differences detected. Review the verification above.');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prodClient.end();
    await stagClient.end();
  }
}

// ============================================================
// FALLBACK: Manual schema export (if supabase CLI fails)
// ============================================================

async function manualSchemaExport(prodClient, schemaFile) {
  console.log('   Building schema manually...');

  let schema = '';

  // 1. Create extension
  schema += 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n';

  // 2. Create enum types
  const enumsResult = await prodClient.query(`
    SELECT t.typname as enum_name,
           string_agg(e.enumlabel, ''', ''' ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  `);

  for (const row of enumsResult.rows) {
    schema += `CREATE TYPE public.${row.enum_name} AS ENUM ('${row.values}');\n`;
  }
  schema += '\n';

  // 3. Create sequences
  const seqsResult = await prodClient.query(`
    SELECT sequence_name, start_value, increment, minimum_value, maximum_value
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  `);

  for (const seq of seqsResult.rows) {
    schema += `CREATE SEQUENCE public.${seq.sequence_name};\n`;
  }
  schema += '\n';

  // 4. Create tables (using proper type mapping)
  const tablesResult = await prodClient.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  for (const tableRow of tablesResult.rows) {
    const tableName = tableRow.table_name;

    // Get columns with proper type info
    const colsResult = await prodClient.query(`
      SELECT
        column_name,
        CASE
          WHEN data_type = 'ARRAY' THEN udt_name || '[]'
          WHEN data_type = 'USER-DEFINED' THEN udt_name
          ELSE data_type
        END as full_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    // Get primary key
    const pkResult = await prodClient.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [`public.${tableName}`]);
    const primaryKeys = pkResult.rows.map(r => r.attname);

    // Build CREATE TABLE
    schema += `CREATE TABLE public."${tableName}" (\n`;

    const colDefs = colsResult.rows.map(col => {
      // Fix array type format: _text -> TEXT[]
      let colType = col.full_type;
      if (colType.startsWith('_')) {
        colType = colType.substring(1).toUpperCase() + '[]';
      }

      let def = `  "${col.column_name}" ${colType}`;
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      return def;
    });

    schema += colDefs.join(',\n');

    if (primaryKeys.length > 0) {
      schema += `,\n  PRIMARY KEY ("${primaryKeys.join('", "')}")`;
    }

    schema += '\n);\n\n';
  }

  // 5. Create views
  const viewsResult = await prodClient.query(`
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
  `);

  for (const view of viewsResult.rows) {
    schema += `CREATE VIEW public."${view.table_name}" AS ${view.view_definition}\n\n`;
  }

  // 6. Create indexes
  const indexResult = await prodClient.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
  `);

  for (const idx of indexResult.rows) {
    schema += `${idx.indexdef};\n`;
  }

  fs.writeFileSync(schemaFile, schema);
  console.log('   ✅ Manual schema export complete');
}

// Run the mirror
mirrorToStaging();
