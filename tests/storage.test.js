/**
 * Retention is a privacy rule, so it gets tests rather than good intentions.
 * Every case here passes `now` explicitly, which is the reason the rule can be checked.
 */

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const store = require("../storage.js");
const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);

const fresh = { id: "fresh", name: "this week", answers: { q1: { value: "yes", at: NOW - 2 * DAY } } };
const stale = { id: "stale", name: "last season", answers: { q1: { value: "yes", at: NOW - 91 * DAY } } };
const clockless = { id: "clockless", name: "no timestamps", answers: { q1: { value: "yes" } } };

describe("the key", () => {
  it("carries a version so a shape change cannot silently misread old sessions", () => {
    assert.match(store.KEY, /\.v\d+$/);
    assert.equal(store.VERSION, 1);
  });
});

describe("loading", () => {
  it("keeps what is recent and drops what is not", () => {
    const result = store.load(JSON.stringify([fresh, stale]), null, NOW);
    assert.deepEqual(result.sessions.map((s) => s.id), ["fresh"]);
    assert.equal(result.dropped, 1);
  });

  it("drops a session whose age cannot be read", () => {
    const result = store.load(JSON.stringify([clockless]), null, NOW);
    assert.equal(result.sessions.length, 0, "unknown age is not a reason to keep personal data");
  });

  it("keeps a session exactly at the limit", () => {
    const onTheLine = { id: "edge", answers: { q1: { at: NOW - store.RETENTION_DAYS * DAY } } };
    assert.equal(store.load(JSON.stringify([onTheLine]), null, NOW).sessions.length, 1);
  });

  it("migrates the old key once", () => {
    const result = store.load(null, JSON.stringify([fresh]), NOW);
    assert.equal(result.sessions.length, 1);
    assert.equal(result.migrated, true, "the caller needs to know to remove the old key");
  });

  it("prefers the current key when both exist", () => {
    const result = store.load(JSON.stringify([fresh]), JSON.stringify([stale]), NOW);
    assert.deepEqual(result.sessions.map((s) => s.id), ["fresh"]);
    assert.equal(result.migrated, false);
  });

  it("survives corrupt storage without losing the page", () => {
    const result = store.load("{not json", "also not json", NOW);
    assert.deepEqual(result.sessions, []);
    assert.equal(result.dropped, 0);
  });
});

describe("saving", () => {
  it("stamps every session and reports what it dropped", () => {
    const saved = store.save([fresh, stale], NOW);
    assert.equal(saved.dropped, 1);
    assert.equal(saved.sessions.length, 1);
    assert.equal(saved.sessions[0].updated_at, NOW, "a saved session must carry its own clock");
    assert.match(saved.json, new RegExp(`"updated_at":${NOW}`));
  });
});

describe("what the interface promises", () => {
  it("states the retention window it actually enforces", () => {
    assert.match(store.describe(), /90 days/);
  });
});
