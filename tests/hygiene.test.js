/**
 * Static guards for the things a unit test cannot reach in a browser app: the page has a
 * policy, nothing is loaded from someone else's server, and there is no dynamic code path.
 * These are cheap and they fail loudly, which is the point.
 */

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const app_source = () => app;

describe("the page", () => {
  it("declares a content security policy", () => {
    assert.match(html, /http-equiv=["']Content-Security-Policy["']/i, "index.html must carry a CSP meta tag");
    const tag = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html)?.[0] ?? "";
    // The policy itself contains single quotes, so the attribute is read up to its own
    // closing delimiter rather than the next quote character.
    const attribute = /content=(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    const policy = attribute?.[1] ?? attribute?.[2] ?? "";
    assert.match(policy, /default-src 'self'/);
    assert.ok(!/script-src[^;]*unsafe-inline/.test(policy), "inline script execution must stay off");
  });

  it("loads no third party script", () => {
    const externals = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).filter((src) => /^https?:|^\/\//.test(src));
    assert.deepEqual(externals, [], "the app must run from its own origin only");
  });
});

describe("session control", () => {
  it("loads storage before the app that uses it", () => {
    const storage = html.indexOf("storage.js");
    const app = html.indexOf("app.js");
    assert.ok(storage > -1, "index.html must load storage.js");
    assert.ok(storage < app, "storage.js must load before app.js");
  });

  it("offers a way to delete everything", () => {
    assert.match(html, /id=["']btn-clear-all["']/, "there must be a control that clears all sessions");
    assert.match(app_source(), /function clearAllSessions/, "and code behind it");
  });

  it("names the retention window in the page, from the same constant", () => {
    assert.match(html, /id=["']storage-note["']/);
    assert.match(app_source(), /STORE\.describe\(\)/, "the note is generated, not retyped");
  });
});

describe("the code", () => {
  it("has no hardcoded storage key left behind", () => {
    assert.equal(/leverage-lens-sessions/.test(app), false, "the legacy key lives in storage.js only");
  });

  it("has no dynamic evaluation", () => {
    assert.equal(/\beval\(|new Function\(/.test(app), false, "eval and new Function are not allowed");
  });

  it("escapes before it renders", () => {
    assert.match(app, /function esc\(/, "an escape helper must exist");
    // Every user-supplied value that reaches markup goes through esc(): the situation and
    // mirror-test answers are the two the coach echoes back.
    for (const field of ["situation", "mirror"]) {
      const line = app.split("\n").find((row) => row.includes(`valOf('${field}')`));
      assert.ok(line, `${field} must be echoed in the report`);
      assert.match(line, /esc\(/, `${field} must be escaped before it enters the report`);
    }
  });
});
