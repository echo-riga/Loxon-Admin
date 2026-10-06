/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS is used to load transpiled route modules in Node's test runner. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const { NextResponse } = require('next/server')

const root = path.resolve(__dirname, '..')

// Exercise the actual route handlers without connecting to the production database.
function routes({ databaseFails = false, authenticated = false } = {}) {
  const modules = new Map()
  const overrides = {
    '@/lib/db': { default: { query: async () => {
      if (databaseFails) throw new Error('Database unavailable')
      return { rows: [{ id: 1, title: 'Public content' }] }
    } } },
    '@/lib/admin-auth': { requireAdmin: async () => authenticated ? null : NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) },
    '@/lib/email': {},
    '@/lib/rate-limit': {},
  }
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports
    const loadedModule = { exports: {} }
    modules.set(filename, loadedModule)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const localRequire = name => {
      if (overrides[name]) return { __esModule: true, ...overrides[name] }
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'))
      return require(name)
    }
    vm.runInNewContext(source, { module: loadedModule, exports: loadedModule.exports, require: localRequire, Request, Response, URL, Buffer, TextEncoder, console: { error() {} } }, { filename })
    return loadedModule.exports
  }
  return endpoint => load(path.join(root, 'src/app', endpoint, 'route.ts'))
}

const publicRoutes = ['api/projects', 'api/clients', 'api/jobs', 'api/products-services', 'api/projects/[id]/images']
const context = () => ({ params: Promise.resolve({ id: '1' }) })

test('public content uses a 60-second CDN TTL with origin variants and no fresh browser TTL', async () => {
  const load = routes()
  for (const endpoint of publicRoutes) {
    const response = await load(endpoint).GET(new Request(`https://admin.example/${endpoint}`), context())
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), 'public, s-maxage=60, must-revalidate')
    assert.equal(response.headers.get('CDN-Cache-Control'), 'public, s-maxage=60, must-revalidate')
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate')
    assert.equal(response.headers.get('Vary'), 'Origin')
    assert.equal(response.headers.get('Set-Cookie'), null)
    assert.equal((await response.json())[0].title, 'Public content')
  }
})

test('dashboard reads bypass shared caching so saved changes can be read immediately', async () => {
  const load = routes()
  for (const endpoint of publicRoutes) {
    const response = await load(endpoint).GET(new Request(`https://admin.example/${endpoint}?fresh=1`), context())
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
    assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), 'no-store')
    assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store')
  }
})

test('database errors never receive the public cache policy', async () => {
  const load = routes({ databaseFails: true })
  for (const endpoint of publicRoutes) {
    const response = await load(endpoint).GET(new Request(`https://admin.example/${endpoint}`), context())
    assert.equal(response.status, 500)
    assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), null)
    assert.equal(response.headers.get('CDN-Cache-Control'), null)
  }
})

test('private submission lists and rejected writes never receive the public cache policy', async () => {
  for (const authenticated of [false, true]) {
    const load = routes({ authenticated })
    for (const endpoint of ['api/contact-submissions', 'api/job-applications']) {
      const response = await load(endpoint).GET(new Request(`https://admin.example/${endpoint}`))
      assert.equal(response.status, authenticated ? 200 : 401)
      assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), null)
      assert.equal(response.headers.get('CDN-Cache-Control'), null)
    }
  }
  const load = routes()
  for (const endpoint of publicRoutes) {
    const response = await load(endpoint).POST(new Request(`https://admin.example/${endpoint}`, { method: 'POST' }), context())
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), null)
    assert.equal(response.headers.get('CDN-Cache-Control'), null)
  }
})
