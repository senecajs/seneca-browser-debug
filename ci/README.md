# CI

`ci.yml` is **active**, at `.github/workflows/ci.yml`. It runs on every
push and pull request. This folder keeps the notes.

## What runs

`npm install` → `npm test`, on every push and pull request.

There is no build step (the package ships plain JS) and no coverage gate.
`npm install` rather than `npm ci`, because `package-lock.json` is
gitignored here and `npm ci` requires a committed lockfile.

Nothing needs credentials or secrets.

## The tests

**10 tests**, in three files, all headless (no DOM: with `ui: false` the
panel is not mounted). They load the `@seneca/browser` bundle in Node.js;
no test runs in a real browser.

* `test/capture.test.js`: the capture engine on a live bus, including an
  error flow, the pure helpers, the control messages, and a check that
  the loaded bundle is `@seneca/browser` 8, which embeds Seneca 4.
* `test/remote.test.js`: capture of real remote flows. The bundle's
  `browser` client transport posts, with the global `fetch` of Node.js,
  to a small `node:http` backend on a free port of 127.0.0.1. Covers a
  remote result and a remote error (with null `details`), and that the
  bus stays usable after the error.
* `test/deprecation.test.js`: the panel, its config and its plugin list
  cause no `SENECA_DEP_*` notice, and a deprecated call inside the bundle
  is not fatal. Inside the bundle a notice goes to `console.warn`, as
  `[SENECA_DEP_...] DeprecationWarning: ...`. Seneca reports each notice
  once per process, so this file keeps to its own process.

`@seneca/browser` `^8.0.0` is the dev dependency. Until
`@seneca/browser` 8.0.0 is on npm, `npm install` cannot resolve it and CI
cannot install; test against a sibling checkout instead (below).

## Which bundle the tests load

`test/load-seneca.js` picks the bundle for every test file:

1. `@seneca/browser`, the dev dependency;
2. `../../seneca-browser/seneca-browser.js`, the sibling checkout, only
   if `@seneca/browser` is not installed, or when
   `SENECA_BROWSER_SIBLING=1` is set.

The test log names the real path of the loaded bundle and how it was
found (`bundle: ... (from ...)`).

## Testing against a sibling checkout

Set `SENECA_BROWSER_SIBLING=1`:

```bash
SENECA_BROWSER_SIBLING=1 npm test
```

This is an **explicit opt-in**. Once `@seneca/browser` is installed it
always resolves, so without the variable the sibling is never used.
Implicitly preferring the sibling would be worse: it would silently
defeat the dev dependency for anyone who happens to have that directory
two levels up.

Presence is decided by `require.resolve()`, with the `require()` itself
outside the `try`. A package that is found but throws while
**evaluating** (a missing transitive dependency, an incompatible runtime)
surfaces that error instead of being mistaken for "not installed" and
falling through to a sibling that may not exist.
