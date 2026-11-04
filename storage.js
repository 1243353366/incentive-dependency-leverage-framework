/**
 * Session storage for a tool whose input is someone's hardest week.
 *
 * Two problems this file exists to solve, both about retention rather than features:
 *
 * 1. Everything used to sit under one unversioned key, forever, with no way to clear it.
 *    Now the key carries a version, sessions are stamped, and anything older than the
 *    retention window is dropped on load.
 * 2. The old key still exists in people's browsers. It is read once, migrated, and removed,
 *    so nobody loses their work to a rename and nobody keeps a stale copy forever.
 *
 * Pure functions only: no localStorage, no DOM, no clock of its own. `now` is passed in, which
 * is what makes the retention rule testable instead of hopeful.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IDLFStorage = api;
})(typeof self !== "undefined" ? self : this, function () {
  const KEY = "idlf.sessions.v1";
  const LEGACY_KEY = "leverage-lens-sessions";
  const VERSION = 1;
  const RETENTION_DAYS = 90;
  const DAY_MS = 86400000;

  function parse(raw) {
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
    } catch {
      return [];
    }
  }

  /**
   * The most recent moment this session was touched. Answers carry their own timestamps, so a
   * session saved before this file existed still has a clock to measure. A session with no
   * clock at all is treated as expired: unreadable age is not a reason to keep something.
   */
  function lastActivity(session) {
    const stamps = [session.updated_at];
    const answers = session.answers && typeof session.answers === "object" ? session.answers : {};
    for (const answer of Object.values(answers)) {
      if (answer && typeof answer.at === "number") stamps.push(answer.at);
    }
    const usable = stamps.filter((value) => typeof value === "number" && Number.isFinite(value));
    return usable.length ? Math.max(...usable) : null;
  }

  function prune(sessions, now, days = RETENTION_DAYS) {
    const cutoff = now - days * DAY_MS;
    const kept = [];
    const expired = [];
    for (const session of sessions) {
      const at = lastActivity(session);
      if (at === null || at < cutoff) expired.push(session);
      else kept.push(session);
    }
    return { kept, expired };
  }

  function load(rawCurrent, rawLegacy, now, days = RETENTION_DAYS) {
    const current = parse(rawCurrent);
    const legacy = parse(rawLegacy);
    const migrated = current.length === 0 && legacy.length > 0;
    const source = current.length ? current : legacy;
    const { kept, expired } = prune(source, now, days);
    return { sessions: kept, migrated, dropped: expired.length, version: VERSION };
  }

  function save(sessions, now, days = RETENTION_DAYS) {
    const { kept, expired } = prune(sessions, now, days);
    const stamped = kept.map((session) => ({ ...session, updated_at: now }));
    return { sessions: stamped, json: JSON.stringify(stamped), dropped: expired.length };
  }

  /** What the interface is allowed to promise, in one place. */
  function describe(days = RETENTION_DAYS) {
    return `Saved in this browser only. Sessions you have not touched in ${days} days are removed the next time the page loads.`;
  }

  return { KEY, LEGACY_KEY, VERSION, RETENTION_DAYS, DAY_MS, parse, lastActivity, prune, load, save, describe };
});
