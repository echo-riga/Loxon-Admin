/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

function fixture({ denied = false, fail = false } = {}) {
  const original = [{ id: 7, title: 'Original', sort_order: 0 }, { id: 9, title: 'Other', sort_order: 1 }]
  let rows = structuredClone(original), snapshot, released = false
  const queries = [], modules = new Map()
  const client = {
    async query(sql, params) {
      queries.push(sql)
      if (sql === 'BEGIN') snapshot = structuredClone(rows)
      if (sql === 'ROLLBACK') rows = snapshot
      if (sql.startsWith('SELECT id')) return { rows }
      if (sql.includes('UPDATE')) {
        rows.find(row => row.id === params[0][0]).sort_order = 0
        if (fail) throw new Error('simulated write failure')
        params[0].forEach((id, position) => { rows.find(row => row.id === id).sort_order = position })
      }
      return { rows: [] }
    },
    release() { released = true },
  }
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports
    const loaded = { exports: {} }
    modules.set(filename, loaded)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    function localRequire(name) {
      if (name === '@/lib/db') return { default: { connect: async () => client } }
      if (name === '@/lib/admin-auth') return { requireAdmin: async () => denied ? Response.json({ error: 'Unauthorized' }, { status: 401 }) : null }
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'))
      return require(name)
    }
    vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: localRequire, Request, Response, URL, TextEncoder, console: { error() {} } }, { filename })
    return loaded.exports
  }
  return { original, queries, get rows() { return rows }, get released() { return released }, route: endpoint => load(path.join(root, `src/app/api/${endpoint}/reorder/route.ts`)).PUT }
}
function request(ids) { return new Request('https://admin.example/api/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds: ids }) }) }

for (const endpoint of ['products-services', 'clients', 'jobs']) {
  test(`${endpoint}: reorder preserves record IDs and content`, async () => {
    const f = fixture()
    assert.equal((await f.route(endpoint)(request([9, 7]))).status, 200)
    assert.deepEqual(f.rows.map(record => ({ id: record.id, title: record.title })), f.original.map(record => ({ id: record.id, title: record.title })))
    assert.deepEqual(f.rows.map(row => row.sort_order), [1, 0])
    assert.ok(f.queries.includes('COMMIT'))
    assert.ok(f.released)
  })
  test(`${endpoint}: incomplete, stale, or unknown IDs cannot partially reorder`, async () => {
    for (const ids of [[7], [7, 10], [7, 9, 10]]) {
      const f = fixture()
      assert.equal((await f.route(endpoint)(request(ids))).status, 409)
      assert.deepEqual(f.rows, f.original)
      assert.ok(f.queries.includes('ROLLBACK'))
      assert.ok(!f.queries.some(sql => sql.includes('UPDATE')))
    }
  })
  test(`${endpoint}: unauthorized and invalid requests do not touch the database`, async () => {
    const denied = fixture({ denied: true })
    assert.equal((await denied.route(endpoint)(request([9, 7]))).status, 401)
    assert.equal(denied.queries.length, 0)
    for (const ids of [[], [7, 7], [7, -1], [7, 1.5], [7, 'invalid'], Array.from({ length: 1001 }, (_, i) => i + 1)]) {
      const f = fixture()
      assert.equal((await f.route(endpoint)(request(ids))).status, 400)
      assert.equal(f.queries.length, 0)
    }
  })
  test(`${endpoint}: a database failure rolls back order changes`, async () => {
    const f = fixture({ fail: true })
    assert.equal((await f.route(endpoint)(request([9, 7]))).status, 500)
    assert.deepEqual(f.rows, f.original)
    assert.ok(!f.queries.includes('COMMIT'))
    assert.ok(f.released)
  })
}
