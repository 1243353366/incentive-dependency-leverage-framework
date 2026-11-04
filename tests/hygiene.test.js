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

describe("the code", () => {
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
