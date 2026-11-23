/* Which @seneca/browser bundle the tests run against.
 *
 * Default: the @seneca/browser package (the dev dependency), so CI and a
 * clean checkout are deterministic. Set SENECA_BROWSER_SIBLING=1 to use a
 * sibling checkout (../../seneca-browser) instead, for validating
 * unreleased upstream changes - an explicit opt-in, because silently
 * preferring whatever happens to sit two directories up would defeat the
 * dev dependency. The sibling is also the fallback when @seneca/browser
 * is not installed at all.
 *
 * require.resolve() decides PRESENCE; the require() itself is outside the
 * try, so an error thrown while EVALUATING a found package propagates
 * instead of being mistaken for "not installed".
 */

const Fs = require('node:fs')
const Path = require('node:path')

const SIBLING = Path.join(__dirname, '..', '..', 'seneca-browser', 'seneca-browser.js')

function resolveBundle() {
  if (process.env.SENECA_BROWSER_SIBLING) {
    return { file: SIBLING, from: 'sibling checkout, SENECA_BROWSER_SIBLING' }
  }

  try {
    return { file: require.resolve('@seneca/browser'), from: '@seneca/browser' }
  }
  catch (e) {
    // Not installed; use the sibling checkout.
    return { file: SIBLING, from: 'sibling checkout, @seneca/browser not installed' }
  }
}

const found = resolveBundle()
const Seneca = require(found.file)

module.exports = {
  Seneca: Seneca,
  // The real path of the bundle that was loaded, and how it was found,
  // for the test log.
  bundle: Fs.realpathSync(found.file) + ' (from ' + found.from + ')',
}
