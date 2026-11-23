/* Seneca 4 reports a deprecated call with process.emitWarning, once per
 * process. Inside the @seneca/browser bundle the notice goes to
 * console.warn, as `[SENECA_DEP_...] DeprecationWarning: ...`. This file
 * runs in its own process (node --test runs each file in a separate
 * process), so no other test has used up a notice before it. */

const { test } = require('node:test')
const assert = require('node:assert')

const { Seneca } = require('./load-seneca.js')

const BrowserDebug = require('../browser-debug.js')

function captureWarn() {
  const warns = []
  const orig = console.warn
  console.warn = function () {
    warns.push(Array.prototype.slice.call(arguments).join(' '))
  }
  return {
    warns: warns,
    restore: function () {
      console.warn = orig
    },
  }
}

function wait(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms || 30)
  })
}

async function make() {
  const seneca = Seneca({ legacy: false, log: 'silent' })
  seneca.use(BrowserDebug, { ui: false })
  seneca.add('a:1', function (m, r) {
    r(null, { x: (m.x || 0) + 1 })
  })
  await seneca.ready()
  return seneca
}

test('the panel, its config and its plugin list cause no deprecation notice', async function () {
  const cap = captureWarn()
  let cfg, out
  try {
    const seneca = await make()
    await seneca.post('a:1')
    out = await seneca.post('sys:browser-debug,get:config')
    cfg = seneca.export('browser-debug/api').config()
    await seneca.post('sys:browser-debug,get:flows')
    await seneca.close()
  }
  finally {
    cap.restore()
  }

  assert.deepEqual(
    cap.warns.filter(function (w) {
      return w.includes('SENECA_DEP_')
    }),
    [],
  )
  for (const plugins of [out.config.plugins, cfg.plugins]) {
    assert.ok(
      plugins.some(function (p) {
        return 'browser-debug' === p.name
      }),
      'browser-debug listed in plugins',
    )
  }
})

test('a deprecated call inside the bundle is not fatal to the panel', async function () {
  const seneca = await make()
  const api = seneca.export('browser-debug/api')

  const cap = captureWarn()
  let out
  try {
    out = await new Promise(function (resolve, reject) {
      // act_if is deprecated (SENECA_DEP_ACT_IF).
      seneca.act_if(true, 'a:1,x:1', function (err, out) {
        return err ? reject(err) : resolve(out)
      })
    })
  }
  finally {
    cap.restore()
  }
  await wait()

  assert.equal(out.x, 2)
  assert.equal(cap.warns.length, 1)
  assert.match(cap.warns[0], /^\[SENECA_DEP_ACT_IF\] DeprecationWarning: /)

  const a = api.flows().find(function (f) {
    return 'a:1' === f.pattern
  })
  assert.ok(a, 'the flow of the deprecated call is captured')
  assert.equal(a.status, 'ok')
  assert.ok(api.config().plugins.length > 0)

  await seneca.close()
})
