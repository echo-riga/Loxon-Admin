/* eslint-disable @typescript-eslint/no-require-imports -- Exercise transpiled modules with mocked external services. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createHash } = require('node:crypto')
const { test } = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

function flow({ denied = null, limited = null, fetch = async () => { throw Error('Unexpected network request') }, env = {
  CLOUDINARY_CLOUD_NAME: 'test-cloud', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret',
} } = {}) {
  const modules = new Map()
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports
    const loaded = { exports: {} }
    modules.set(filename, loaded)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    function localRequire(name) {
      if (name === '@/lib/admin-auth') return { requireAdmin: async () => denied, getAdminFromRequest: async () => ({ email: 'test@example.com' }) }
      if (name === '@/lib/rate-limit') return { applyRateLimit: async () => limited, rateLimitIdentifier: () => 'test', rateLimits: { upload: {} } }
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'))
      if (name.startsWith('./')) return load(path.resolve(path.dirname(filename), name + '.ts'))
      return require(name)
    }
    vm.runInNewContext(source, {
      module: loaded, exports: loaded.exports, require: localRequire, Request, Response, URL, TextEncoder,
      FormData, File, AbortSignal, fetch, process: { env }, console,
    }, { filename })
    return loaded.exports
  }
  return {
    sign: load(path.join(root, 'src/app/api/uploads/images/route.ts')).POST,
    upload: load(path.join(root, 'src/lib/upload-image.ts')).uploadImage,
  }
}

function metadata(size = 6 * 1024 * 1024, type = 'image/png') {
  return new Request('https://admin.example/api/uploads/images', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, size }),
  })
}

test('6 MB image sends only metadata to admin and file bytes directly to Cloudinary', async () => {
  const calls = []
  let pipeline
  pipeline = flow({ fetch: async (url, options) => {
    calls.push({ url, options })
    if (url === '/api/uploads/images') return pipeline.sign(new Request('https://admin.example' + url, options))
    assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload')
    assert.equal(options.body.get('file').size, 6 * 1024 * 1024)
    assert.equal(options.body.get('overwrite'), 'false')
    assert.equal(options.body.get('allowed_formats'), 'jpg,png,webp,gif,avif')
    assert.equal(options.credentials, 'omit')
    const signedParams = [...options.body.entries()].filter(([key]) => !['file', 'api_key', 'signature'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&')
    assert.equal(options.body.get('signature'), createHash('sha1').update(signedParams + 'test-secret').digest('hex'))
    return Response.json({ secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/cover.png' })
  } })
  const file = new File([new Uint8Array(6 * 1024 * 1024)], 'cover.png', { type: 'image/png' })
  assert.equal(await pipeline.upload(file), 'https://res.cloudinary.com/test-cloud/image/upload/cover.png')
  assert.equal(calls.length, 2)
  assert.equal(typeof calls[0].options.body, 'string')
  assert.ok(calls[0].options.body.length < 100)
  assert.ok(!calls[0].options.body.includes('test-secret'))
})

test('signatures stay private and have unique non-overwriting public IDs', async () => {
  const pipeline = flow()
  const first = await pipeline.sign(metadata())
  const second = await pipeline.sign(metadata())
  assert.equal(first.headers.get('cache-control'), 'private, no-store')
  const a = await first.json()
  const b = await second.json()
  assert.notEqual(a.params.public_id, b.params.public_id)
  assert.ok(!JSON.stringify(a).includes('test-secret'))
})

test('signing requires authentication, working rate limits, configuration, and valid small metadata', async () => {
  assert.equal((await flow({ denied: Response.json({}, { status: 401 }) }).sign(metadata())).status, 401)
  assert.equal((await flow({ limited: Response.json({}, { status: 429 }) }).sign(metadata())).status, 429)
  assert.equal((await flow({ env: {} }).sign(metadata())).status, 503)
  const pipeline = flow()
  for (const [size, type, status] of [[0, 'image/png', 413], [8 * 1024 * 1024 + 1, 'image/png', 413], [1, 'image/svg+xml', 415], ['100', 'image/png', 413]]) {
    assert.equal((await pipeline.sign(metadata(size, type))).status, status)
  }
  assert.equal((await pipeline.sign(new Request('https://admin.example/api/uploads/images', { method: 'POST', body: 'invalid' }))).status, 400)
  assert.equal((await pipeline.sign(new Request('https://admin.example/api/uploads/images', { method: 'POST', body: JSON.stringify({ padding: 'x'.repeat(2048) }) }))).status, 413)
})

test('client validates before network requests and surfaces signing and Cloudinary errors', async () => {
  await assert.rejects(flow().upload(new File([], 'empty.png', { type: 'image/png' })), /between 1 byte and 8 MB/)
  const file = new File(['image'], 'image.png', { type: 'image/png' })
  await assert.rejects(flow({ fetch: async () => Response.json({ error: 'Authentication required.' }, { status: 401 }) }).upload(file), /Authentication required/)
  let count = 0
  await assert.rejects(flow({ fetch: async () => ++count === 1
    ? Response.json({ uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload', params: { signature: 'test' } })
    : Response.json({ error: { message: 'Image file is invalid' } }, { status: 400 }) }).upload(file), /Image file is invalid/)
  count = 0
  await assert.rejects(flow({ fetch: async () => ++count === 1
    ? Response.json({ uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload', params: { signature: 'test' } })
    : Response.json({}) }).upload(file), /without a valid image URL/)
})
