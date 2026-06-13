// Applies the SQL migrations at container startup using @prisma/client,
// so the runtime image does not need the full Prisma CLI.
// Tracks applied migrations in a "_migrations" table so schema upgrades
// work on existing volumes without losing data.
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// First migration ever shipped; DBs created before tracking existed have
// exactly this one applied.
const BOOTSTRAP_MIGRATION = '20260612071304_init'

async function main() {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table'"
  )
  const tableNames = tables.map((t) => t.name)

  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "_migrations" ("name" TEXT PRIMARY KEY)'
  )
  if (tableNames.includes('User')) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "_migrations" ("name") VALUES ('${BOOTSTRAP_MIGRATION}')`
    )
  }

  const appliedRows = await prisma.$queryRawUnsafe('SELECT name FROM "_migrations"')
  const applied = new Set(appliedRows.map((r) => r.name))

  const migrationsDir = path.join(__dirname, 'migrations')
  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  for (const dir of dirs) {
    if (applied.has(dir)) {
      console.log(`Migration ${dir} already applied`)
      continue
    }
    const sql = fs.readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8')
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement)
    }
    await prisma.$executeRawUnsafe(`INSERT INTO "_migrations" ("name") VALUES ('${dir}')`)
    console.log(`Applied migration ${dir}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
