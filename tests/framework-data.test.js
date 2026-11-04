/**
 * The framework is data, and the app is a renderer. That makes the data testable without a
 * browser, which is the cheapest place to catch a broken layer, a duplicate id, or a string
 * that would become markup.
 */

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

const SOURCE = fs.readFileSync("framework-data.js", "utf8");
const PROBE = `
;globalThis.__F = (typeof FRAMEWORK !== "undefined" && FRAMEWORK)
  || (typeof window !== "undefined" && window.FRAMEWORK)
  || (typeof DATA !== "undefined" && DATA)
  || null;`;

function load() {
  const context = { window: {}, document: undefined };
  vm.createContext(context);
  vm.runInContext(SOURCE + PROBE, context);
  return context.__F;
}

function walk(node, out = [], seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const entry of node) walk(entry, out, seen);
    return out;
  }
  out.push(node);
  for (const value of Object.values(node)) walk(value, out, seen);
  return out;
}

const data = load();
const nodes = walk(data);
const records = nodes.filter((node) => typeof node.id === "string" && (typeof node.title === "string" || typeof node.name === "string"));

describe("the framework data", () => {
  it("loads as an object", () => {
    assert.ok(data && typeof data === "object", "framework-data.js must publish one object");
    assert.ok(nodes.length > 20, `expected a substantial document tree, walked ${nodes.length} nodes`);
  });

  it("has addressable sections with titles", () => {
    assert.ok(records.length >= 20, `expected at least 20 addressable sections, found ${records.length}`);
    for (const record of records) {
      const title = record.title ?? record.name;
      assert.ok(title.trim().length > 0, `section ${record.id} has no title`);
    }
  });

  it("has no duplicate ids", () => {
    const seen = new Map();
    for (const record of records) {
      if (seen.has(record.id)) assert.fail(`duplicate id: ${record.id}`);
      seen.set(record.id, true);
    }
  });

  it("carries no markup payloads", () => {
    const strings = [];
    const collect = (node) => {
      if (typeof node === "string") strings.push(node);
      else if (node && typeof node === "object") Object.values(node).forEach(collect);
    };
    collect(data);
    for (const value of strings) {
      assert.ok(!/<script/i.test(value), `a section contains a script tag: ${value.slice(0, 60)}`);
      assert.ok(!/javascript:/i.test(value), `a section contains a javascript: URL: ${value.slice(0, 60)}`);
      assert.ok(!/onerror\s*=/i.test(value), `a section contains an inline handler: ${value.slice(0, 60)}`);
    }
  });
});
