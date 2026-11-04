/**
 * The gap that let a dead page ship: nothing executed app.js.
 *
 * The retention commit bound a control near the top of the file that read a const declared
 * further down. Top-level consts sit in a temporal dead zone, so the read threw, and every
 * handler after it was never attached. The unit tests passed, CI passed, and the page was
 * broken for anyone who opened it.
 *
 * This runs the real scripts in a stubbed document. It is not a browser and it is not a click
 * test, but it is enough to catch a script that cannot finish loading.
 */

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

const SCRIPTS = ["storage.js", "framework-data.js", "app.js", "layer24.js", "layer24-ui.js"];

function boot() {
  const elements = new Map();
  const element = (id) => ({
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    href: "",
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    getAttribute() {
      return null;
    },
    setAttribute() {},
    click() {},
    style: {},
    dataset: {},
    children: [],
    appendChild() {
      return null;
    },
    removeChild() {},
    insertBefore() {},
    remove() {},
    focus() {},
    scrollIntoView() {},
    querySelector() {
      return null;
    },
  });
  const document = {
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, element(id));
      return elements.get(id);
    },
    querySelectorAll: () => [],
    createElement: (tag) => element(tag),
    addEventListener() {},
  };
  const storage = {
    data: new Map(),
    getItem(key) {
      return this.data.has(key) ? this.data.get(key) : null;
    },
    setItem(key, value) {
      this.data.set(key, String(value));
    },
    removeItem(key) {
      this.data.delete(key);
    },
  };
  const context = {
    window: null,
    document,
    localStorage: storage,
    console: { info() {}, log() {}, warn() {}, error() {} },
    Date,
    Blob: class {},
    URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    confirm: () => false,
    alert() {},
  };
  context.window = context;
  vm.createContext(context);
  return { context, document };
}

describe("the page scripts", () => {
  it("all load to completion in one document", () => {
    const { context } = boot();
    for (const script of SCRIPTS) {
      assert.doesNotThrow(
        () => vm.runInContext(fs.readFileSync(script, "utf8"), context, { filename: script }),
        `${script} threw while loading; in a browser that kills every handler after it`,
      );
    }
    assert.equal(typeof context.switchTab, "function", "switchTab must exist after load");
    assert.equal(typeof context.IDLFLayer24UI, "object", "the layer 24 screen must mount itself");
  });

  it("renders the layer form and the gate status", () => {
    const { context } = boot();
    for (const script of SCRIPTS) vm.runInContext(fs.readFileSync(script, "utf8"), context);
    const body = context.document.getElementById("l24-body").innerHTML;
    const status = context.document.getElementById("l24-status").innerHTML;
    assert.match(body, /l24-section/, "the form must render its sections");
    assert.match(status, /No conclusion yet/, "an empty form opens no conclusion");
  });

  it("fills the retention note from the same constant it enforces", () => {
    const { context } = boot();
    for (const script of SCRIPTS) vm.runInContext(fs.readFileSync(script, "utf8"), context);
    assert.match(context.document.getElementById("storage-note").textContent, /90 days/);
  });

  it("switches to the third view without a branch", () => {
    const { context, document } = boot();
    for (const script of SCRIPTS) vm.runInContext(fs.readFileSync(script, "utf8"), context);
    assert.doesNotThrow(() => context.switchTab("layer24"));
    assert.doesNotThrow(() => context.switchTab("nonsense"));
  });
});
