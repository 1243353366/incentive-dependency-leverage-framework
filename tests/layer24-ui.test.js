/**
 * The screen is a form. Everything it can say lives in layer24.js, which is why this file tests
 * the page wiring and the text, and not a browser.
 */

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");

const layer = require("../layer24.js");
const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const ui = fs.readFileSync("layer24-ui.js", "utf8");

const NOW = Date.UTC(2026, 10, 4);
const answers = {
  "act-what": { text: "Moved the meeting twice without saying so." },
  "read-guarding": { text: "Possibly protecting a deadline they cannot admit to." },
  "enable-routine": { text: "Standup at nine." },
  "alt-1": { text: "They are overloaded." },
  "alt-2": { text: "I am reading tone into brevity." },
  "alt-3": { text: "We have different defaults about notice." },
  "alt-4": { text: "They respond to my lateness." },
  "alt-5": { text: "They are managing me out and avoiding the conversation." },
  "disconfirm-1": { text: "If they moved it for the client, the client calendar would show it." },
  "custody-1": { text: "Calendar invites, which I hold myself." },
  "frame-goals": { text: "A working arrangement, not an apology." },
  "frame-risk": { text: "Willing to be told I am wrong in writing." },
};

describe("the page", () => {
  it("has a tab and a view, and the view is not active by default", () => {
    assert.match(html, /id="tab-layer24"/);
    assert.match(html, /id="view-layer24" class="view"/);
    assert.equal(/id="view-layer24" class="view active"/.test(html), false, "the coach stays the default screen");
  });

  it("loads the layer and its screen after the app it plugs into", () => {
    const layerAt = html.indexOf("layer24.js");
    const uiAt = html.indexOf("layer24-ui.js");
    const appAt = html.indexOf("app.js");
    assert.ok(layerAt > -1 && uiAt > -1);
    assert.ok(layerAt > appAt && uiAt > appAt, "both load after app.js, so switchTab already exists");
  });

  it("switches to the third view by name rather than by a branch", () => {
    assert.match(app, /const VIEWS = \['library', 'coach', 'layer24'\]/);
    assert.match(app, /getElementById\('view-' \+ target\)/);
  });

  it("escapes what it writes into the page", () => {
    assert.match(ui, /function esc|const esc =/);
    assert.equal(/innerHTML = [^;]*answers\[/.test(ui), false, "answers go through esc() before markup");
  });
});

describe("the status line", () => {
  it("refuses to declare a conclusion while the gate is shut", () => {
    const status = layer.formatStatus(layer.assess({}));
    assert.equal(status.ready, false);
    assert.match(status.headline, /No conclusion yet/);
    assert.ok(status.lines.length >= 4, "every unmet requirement is listed");
  });

  it("says so when the gate opens", () => {
    const status = layer.formatStatus(layer.assess(answers));
    assert.equal(status.ready, true, JSON.stringify(layer.assess(answers).missing));
    assert.match(status.headline, /Conclusion open/);
  });

  it("keeps an unjustified exposure visible on the screen", () => {
    const status = layer.formatStatus(layer.assess(answers));
    assert.equal(status.lines.some((line) => line.kind === "unjustified"), true);
  });
});

describe("the export", () => {
  it("carries what was written and omits what was not", () => {
    const text = layer.exportText(answers, NOW);
    assert.match(text, /Moved the meeting twice/);
    assert.equal(/Were you told this, or did you infer it/.test(text), false, "unanswered questions are omitted");
    assert.match(text, /## Gate/);
    assert.match(text, /Conclusion open/);
  });

  it("states an unstated justification rather than inventing one", () => {
    const text = layer.exportText(answers, NOW);
    assert.match(text, /_Decision affected:_ \(not stated\)/);
  });

  it("is plain text with no markup payload", () => {
    const text = layer.exportText({ "act-what": { text: "<script>alert(1)</script>" } }, NOW);
    assert.equal(/<script>/.test(text), false, "a downloaded file must not carry markup");
  });
});
