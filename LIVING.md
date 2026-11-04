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
| storage | sessions in this browser's `localStorage`; nothing is transmitted |
| tests | data invariants, page hygiene, escaping guards (`make test`) |
| CI | runs the suite and the interpolation audit on every push |
| premise | "My wins should never create a future problem for me." The framework reasons about leverage; this repository is bound by the same rule it describes. |

## What has actually been measured

- **Structural invariants of the data:** addressable sections exist, ids are unique, titles
  are non-empty, no section carries markup or a `javascript:` URL. These are checked.
- **Nothing empirical.** There is no study showing the framework improves decisions, and no
  outcome data behind any layer. It is a structured way of asking questions, not a validated
  instrument. Saying otherwise would be the exact failure the framework warns about.

## Open decisions

- **Retention.** Sessions sit in `localStorage` indefinitely, under one key, with no version
  and no expiry. Someone's most sensitive situation stays on a shared laptop until they clear
  their browser. Decide: an explicit clear control, a version tag, or both.
- **Frame protection.** `frame-ancestors` cannot be set from a meta tag, so clickjacking
  protection needs a hosting header. GitHub Pages does not allow custom headers.
- **Advice posture.** The coach produces a structured report. Whether that reads as analysis
  or as instruction is a product decision, and the safer default is analysis.

## Known limits

- No test executes the app. The suite reads the data and greps the source; the coach's
  behaviour on a real decision path is unverified by machine.
- The escaping guards assert that `esc()` is applied where it is applied today. A new
  interpolation elsewhere would need `make audit` and a human reading it.
- The framework names adversarial tactics (DARVO, elicitation). Published without context,
  that material is as usable against someone as for them. See `docs/limits.md`.

## Change log of this document

- 2026-11-04 created, alongside the first test suite and the CSP.
