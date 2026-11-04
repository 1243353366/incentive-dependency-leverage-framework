# Changelog

## Unreleased

### Changed

- **Session storage is versioned, bounded and clearable** (`storage.js`). Sessions moved to
  `idlf.sessions.v1`, are stamped with `updated_at` on save, and anything untouched for 90
  days is dropped on the next load. The old `leverage-lens-sessions` key is read once,
  migrated, and removed, so nobody loses their work to a rename and nobody keeps a stale copy
  forever. A "Clear all" control deletes everything, and the retention line in the interface
  is generated from the same constant the code enforces rather than retyped in the markup.
  A session with no readable timestamp is treated as expired: unknown age is not a reason to
  keep someone's hardest week on a shared laptop.
- **Retention logic is pure and tested** (`tests/storage.test.js`): `now` is passed in, so the
  window is checked rather than assumed, including the exact boundary day, corrupt storage,
  and the migrate-once path.

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
