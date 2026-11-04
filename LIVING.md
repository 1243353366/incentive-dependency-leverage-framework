# Living document

The current state of this repository. Updated on every push that changes behaviour, not on a
schedule. Last touched 2026-11-04.

If a claim here cannot be checked against the code or the tests in one command, it belongs in
`docs/` as an intention, not here.

## Where it stands

| | |
| --- | --- |
| repository | public, `github.com/1243353366/incentive-dependency-leverage-framework` |
| product state | static app, live on GitHub Pages, no server, no accounts |
| storage | versioned key in this browser's `localStorage`, pruned at 90 days, clearable; nothing is transmitted |
| tests | data invariants, page hygiene, escaping guards (`make test`) |
| CI | runs the suite and the interpolation audit on every push |
| premise | "My wins should never create a future problem for me." The framework reasons about leverage; this repository is bound by the same rule it describes. |

## What has actually been measured

- **Structural invariants of the data:** addressable sections exist, ids are unique, titles
  are non-empty, no section carries markup or a `javascript:` URL. These are checked.
- **Nothing empirical.** There is no study showing the framework improves decisions, and no
  outcome data behind any layer. It is a structured way of asking questions, not a validated
  instrument. Saying otherwise would be the exact failure the framework warns about.

## Layer 24, added 2026-11-04

The actor analysis layer ships as data plus a gate (`layer24.js`), tested: 38 questions sorted
into evidence, interpretation and operational, with a conclusion blocked until five alternative
explanations, one disconfirming item, one provenance item, and both parts of the analyst's own
frame exist. Every operational question carries a second one: what decision changes if this is
different.

Wired as a third tab (`layer24-ui.js`, own view, own storage key). The screen is a form and a
status line: it reports what the gate says and cannot open it. Answers never leave the browser
except through the export button.

**A dead page shipped on 2026-11-04 and this is the record of it.** The retention commit bound a
control near the top of `app.js` that read a `const` declared further down. Top-level consts sit
in a temporal dead zone, so the read threw, and every handler after it was never attached. Unit
tests passed, CI passed, and the page was dead for anyone who opened it. Nothing executed
`app.js`, which is exactly the gap this document already named. `tests/app-loads.test.js` now
runs every script in a stubbed document, so a script that cannot finish loading fails CI instead
of shipping.

## Open decisions

- **Retention, resolved 2026-11-04.** Sessions now live under `idlf.sessions.v1`, are stamped
  on save, are dropped after 90 days untouched, and can be cleared in one control. The old key
  is migrated once and removed. What remains open is the case below.
- **Frame protection.** `frame-ancestors` cannot be set from a meta tag, so clickjacking
  protection needs a hosting header. GitHub Pages does not allow custom headers.
- **A browser that is never reopened.** Pruning happens on load and on save, so a session on a
  machine nobody opens again outlives the window. Fixing that needs a server or a service
  worker, and both are larger than this app. Stated, not hidden.
- **Advice posture.** The coach produces a structured report. Whether that reads as analysis
  or as instruction is a product decision, and the safer default is analysis.

## Known limits

- No test drives the app. Scripts are loaded in a stubbed document now, so a fatal load error
  is caught, but the coach's behaviour on a real decision path and every click path remain
  unverified by machine. A headless browser is the missing instrument.
- The escaping guards assert that `esc()` is applied where it is applied today. A new
  interpolation elsewhere would need `make audit` and a human reading it.
- The framework names adversarial tactics (DARVO, elicitation). Published without context,
  that material is as usable against someone as for them. See `docs/limits.md`.

## Change log of this document

- 2026-11-04 created, alongside the first test suite and the CSP.
- 2026-11-04 layer 24 screen wired, and the app.js temporal dead zone that killed the page
  fixed, with a load test so it cannot happen quietly again.
- 2026-11-04 layer 24 added: actor analysis with a gate, engine and tests only.
- 2026-11-04 retention bounded: versioned key, 90 day prune, clear-all control, legacy key
  migrated. Decided against a JavaScript frame-buster: it is trivially bypassed, it breaks
  legitimate previews, and claiming clickjack protection from it would be worse than naming
  the gap.
