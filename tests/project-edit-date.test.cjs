/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loads transpiled route modules in Node's test runner. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function projectEditor() {
  const queries = []
  const modules = new Map()
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports
    const loaded = { exports: {} }
    modules.set(filename, loaded)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    function localRequire(name) {
      if (name === '@/lib/db') return { default: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [{ id: 1 }] } } } }
      if (name === '@/lib/admin-auth') return { requireAdmin: async () => null }
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'))
      return require(name)
    }
    vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: localRequire, Request, Response, URL, TextEncoder, console }, { filename })
    return loaded.exports
  }
  return {
    queries,
    editFormValues: load(path.join(root, 'src/lib/edit-form.ts')).editFormValues,
    update: load(path.join(root, 'src/app/api/projects/[id]/route.ts')).PUT,
  }
}

test('editing another project field preserves an untouched ISO constructed date', async () => {
  const editor = projectEditor()
  for (const timestamp of ['2024-02-29T00:00:00.000Z', '2024-02-29T00:00:00+08:00']) {
    const row = { title: 'Original', constructed_date: timestamp }
    const form = editor.editFormValues(row, ['constructed_date'])
    form.title = 'Updated title'
    const response = await editor.update(new Request('https://admin.example/api/projects/1', {
      method: 'PUT', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' },
    }), { params: Promise.resolve({ id: '1' }) })
    assert.equal(response.status, 200)
    assert.equal(editor.queries.at(-1).values[5], '2024-02-29')
    assert.equal(row.constructed_date, timestamp)
    assert.equal(row.title, 'Original')
  }
})

test('empty and date-only constructed dates still save; invalid dates stay rejected', async () => {
  const editor = projectEditor()
  for (const [value, status] of [[null, 200], ['', 200], ['2026-10-06', 200], ['2026-02-30T00:00:00.000Z', 400], ['not a date', 400]]) {
    const form = editor.editFormValues({ title: 'Project', constructed_date: value }, ['constructed_date'])
    const response = await editor.update(new Request('https://admin.example/api/projects/1', { method: 'PUT', body: JSON.stringify(form) }), { params: Promise.resolve({ id: '1' }) })
    assert.equal(response.status, status)
  }
  assert.equal(editor.queries.length, 3)
})
