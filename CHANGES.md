# Changes

## 0.1.1 2026-11-23

First release, and first entry of this change log. The package was never
published before. The repository came from voxgig
(`voxgig/seneca-browser-debug`), where the package was named
`@voxgig/seneca-browser-debug`.

* Published as `@seneca/browser-debug`. The plugin name
  (`browser-debug`), its export (`browser-debug/api`), its messages
  (`sys:browser-debug,*`) and the file names are unchanged.
* Seneca 4: the plugin runs inside the Seneca 4.0.0 that
  `@seneca/browser` 8 embeds. It has no dependency on `seneca` itself.
* The plugin list of the Config tab comes from `seneca.list_plugins()`
  only. The fallback to the deprecated `seneca.plugins()` is removed
  (D1), so the panel causes no deprecation notice.
* The Store tab names `@seneca/browser-cache` (it named
  `@voxgig/seneca-browser-store`) when no store plugin is loaded.
* Optional peer dependency `@seneca/browser` `^8.0.0`. npm does not
  install it for you, so an app that loads the bundle from a script tag
  or a vendored copy needs nothing more.
* Development: `seneca-browser` `8.0.0-rc2` is replaced by
  `@seneca/browser` `^8.0.0`, which fixes the error-path crash of
  8.0.0-rc3 and rc4 (`errline`) and the `process.emitWarning` crash on a
  deprecated call.
* Node.js 24 or later for development (`engines.node` `>=24`).
* Tests: new tests capture real remote flows (the `browser` client
  transport against a local `node:http` backend, including a remote
  error), check that the panel causes no deprecation notice and that a
  deprecated call inside the bundle is not fatal, and check which bundle
  is loaded. The stray Playwright output `test-results/.last-run.json`
  is removed, and `test-results/` is ignored.
* Not tested: no test runs in a real browser. The tests run the bundle in
  Node.js, without a DOM, so the in-window panel itself is not tested
  here.
