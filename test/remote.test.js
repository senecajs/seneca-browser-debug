/* Capture of real remote flows. The bundle's `browser` client transport
 * posts each `aim:*` message, with the global fetch of Node.js, to a
 * small node:http backend on a free port of 127.0.0.1. The backend
 * answers in the JSON of Seneca's transport utilities: the message
 * arrives with `meta$`, and the reply carries `meta$`, with
 * `meta$.error` set for an error (HTTP status 500, as
 * @seneca/gateway-express sends one). */

const { test, before, after } = require('node:test')
const assert = require('node:assert')
const Http = require('node:http')

const { Seneca } = require('./load-seneca.js')

const BrowserDebug = require('../browser-debug.js')

let server
let base

function backend(msg) {
  if ('x' === msg.ping) {
    return { pong: true, x: msg.x }
  }
  if ('x' === msg.fail) {
    return { error: { code: 'remote_failed', message: 'remote failed', details: null } }
  }
  return { error: { code: 'not_found', message: 'not found' } }
}

before(async function () {
  server = Http.createServer(function (req, res) {
    let body = ''
    req.on('data', function (chunk) {
      body += chunk
    })
    req.on('end', function () {
      const msg = JSON.parse(body)
      const meta = msg.meta$ || {}
      delete msg.meta$

      const out = backend(msg)
      const reply = out.error
        ? Object.assign({}, out.error, { meta$: { id: meta.id, error: true } })
        : Object.assign({}, out, { meta$: { id: meta.id } })

      res.writeHead(out.error ? 500 : 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(reply))
    })
  })

  await new Promise(function (resolve, reject) {
    server.listen(0, '127.0.0.1', resolve).on('error', reject)
  })
  base = 'http://127.0.0.1:' + server.address().port
})

after(async function () {
  if (server) {
    server.closeAllConnections()
    await new Promise(function (resolve) {
      server.close(resolve)
    })
  }
})

function wait(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms || 50)
  })
}

test('captures remote ok and remote error flows; the bus stays usable', async function () {
  const seneca = Seneca({
    legacy: false,
    log: 'silent',
    timeout: 2222,
    plugin: { browser: { endpoint: base + '/seneca' } },
  }).client({ type: 'browser', pin: 'aim:*' })
  seneca.use(BrowserDebug, { ui: false, remotePins: 'aim:*' })
  await seneca.ready()

  const out = await seneca.post('aim:req,ping:x', { x: 1 })
  assert.equal(out.pong, true)

  // The remote error reaches the caller unchanged; null details are fine.
  const err = await new Promise(function (resolve) {
    seneca.act('aim:req,fail:x', function (err) {
      resolve(err)
    })
  })
  assert.ok(err, 'remote error replied')
  assert.equal(err.code, 'remote_failed')

  await assert.rejects(seneca.post('aim:req,fail:x'), function (err) {
    assert.equal(err.code, 'remote_failed')
    return true
  })

  // Still usable after the errors.
  const again = await seneca.post('aim:req,ping:x', { x: 2 })
  assert.equal(again.x, 2)
  await wait()

  const flows = seneca.export('browser-debug/api').flows()

  // The pattern of a remote flow is the client pin.
  const ok = flows.filter(function (f) {
    return 'aim:*' === f.pattern && 'x' === f.msg.ping
  })
  assert.equal(ok.length, 2)
  assert.equal(ok[0].status, 'ok')
  assert.equal(ok[0].dir, 'remote')
  assert.equal(ok[0].result.pong, true)

  const bad = flows.filter(function (f) {
    return 'aim:*' === f.pattern && 'x' === f.msg.fail
  })
  assert.equal(bad.length, 2)
  assert.equal(bad[0].status, 'err')
  assert.equal(bad[0].dir, 'remote')
  assert.equal(bad[0].result.code, 'remote_failed')
  assert.equal(typeof bad[0].error, 'string')

  await seneca.close()
})
