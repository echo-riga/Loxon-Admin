/* eslint-disable @typescript-eslint/no-require-imports -- Node migration runner uses CommonJS. */
const fs = require('node:fs')
const path = require('node:path')
const { loadEnvConfig } = require('@next/env')
const { Pool } = require('pg')
loadEnvConfig(path.resolve(__dirname, '..'))
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not configured. Add it to .env.local or set it in the terminal before running this migration.')
  process.exit(1)
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })
const tables = ['products_services', 'clients', 'jobs']
async function fingerprints(client) {
  const result = {}
  for (const table of tables) {
    const query = await client.query(`SELECT COUNT(*)::integer AS count,
      md5(COALESCE(string_agg((to_jsonb(record) - 'sort_order')::text, '' ORDER BY id), '')) AS checksum
      FROM ${table} AS record`)
    result[table] = query.rows[0]
  }
  return result
}
async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('LOCK TABLE products_services, clients, jobs IN SHARE ROW EXCLUSIVE MODE')
    const before = await fingerprints(client)
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/20261010_content_order.sql'), 'utf8')
      .replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '')
    await client.query(sql)
    const after = await fingerprints(client)
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Record preservation check failed; migration rolled back.')
    await client.query('COMMIT')
    console.log('Content ordering migration applied. All existing IDs and content preserved.')
    for (const table of tables) console.log(`${table}: ${after[table].count} records verified`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}
migrate().catch(error => { console.error(error.message || error.code || 'Unable to connect to the database.'); process.exitCode = 1 }).finally(() => pool.end())
