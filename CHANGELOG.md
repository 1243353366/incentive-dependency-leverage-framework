# Changelog

## Unreleased

### Added

- **Test suite** (`tests/`): framework data invariants (addressable sections, unique ids,
  non-empty titles, no markup payloads) and page hygiene (CSP present, no third party script,
  no `eval`, escaping applied where user text is echoed into the report). Runs on Node 24 with
  no dependencies.
- **CI** (`.github/workflows/ci.yml`): the suite plus the interpolation audit on every push.
- **`tools/audit.js`**: report-only listing of every template interpolation in `app.js` that
  is not wrapped in an escape helper, so a reviewer reads rather than assumes.
- **`LIVING.md`**: current state, what has been measured, what has not, open decisions.
- **`docs/limits.md`** and **`docs/review-2026-11-04.md`**: the limits of the instrument, and
  the review that produced this commit.

### Security

- **Content Security Policy added** to `index.html`: `default-src 'self'`, scripts from this
  origin only, no inline script, `base-uri 'none'`, `form-action 'none'`. The page previously
  had no policy, so any future injected markup would have run with the page's full authority.
