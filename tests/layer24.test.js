/**
 * The gate is the layer. If it opens early, the questions above it are a form that produces
 * a first impression with a receipt.
 */

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const layer = require("../layer24.js");

const answered = (ids) => Object.fromEntries(ids.map((id) => [id, { text: "something specific" }]));
const FULL = answered([
  "alt-1", "alt-2", "alt-3", "alt-4", "alt-5",
  "disconfirm-1",
  "custody-1",
  "frame-goals", "frame-risk",
]);

describe("the questions", () => {
  it("covers every section with unique ids and known kinds", () => {
    const ids = layer.QUESTIONS.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, "ids must be unique");
    assert.ok(layer.QUESTIONS.length >= 30, "this layer is a long list by design");
    for (const question of layer.QUESTIONS) {
      assert.ok(layer.KINDS.includes(question.kind), `${question.id} has an unknown kind`);
      assert.ok(layer.SECTIONS.some((s) => s.id === question.section), `${question.id} has an unknown section`);
      assert.ok(question.text.trim().length > 20);
    }
  });

  it("separates a fact from a reading and from an exposure", () => {
    const byId = Object.fromEntries(layer.QUESTIONS.map((q) => [q.id, q]));
    assert.equal(byId["act-what"].kind, "evidence");
    assert.equal(byId["interior-guarding"].kind, "interpretation", "character is never evidence of intent");
    assert.equal(byId["enable-routine"].kind, "operational");
  });
});

describe("the gate", () => {
  it("blocks a conclusion built on a first impression", () => {
    const result = layer.assess(answered(["act-what", "act-when", "read-guarding"]));
    assert.equal(result.ready, false);
    assert.ok(result.missing.some((line) => line.includes("alternative")), "alternatives must be required");
    assert.ok(result.missing.some((line) => line.includes("disconfirming")));
    assert.ok(result.missing.some((line) => line.includes("provenance")));
  });

  it("opens once alternatives, disconfirmation, provenance and the analyst's own frame exist", () => {
    const result = layer.assess(FULL);
    assert.equal(result.ready, true, JSON.stringify(result.missing));
    assert.deepEqual(result.missing, []);
  });

  it("will not treat four alternatives as five", () => {
    const four = { ...FULL };
    delete four["alt-5"];
    const result = layer.assess(four);
    assert.equal(result.ready, false);
    assert.ok(result.warnings.some((line) => line.includes("fifth alternative")));
  });

  it("does not accept a blank answer as an answer", () => {
    const blank = { ...FULL, "alt-3": { text: "   " } };
    assert.equal(layer.assess(blank).ready, false);
  });

  it("flags an exposure with no decision attached", () => {
    const result = layer.assess({ ...FULL, "enable-routine": { text: "gym at seven" } });
    assert.deepEqual(result.unjustified, ["enable-routine"]);
  });

  it("clears the flag once the decision is named", () => {
    const result = layer.assess({
      ...FULL,
      "enable-routine": { text: "gym at seven" },
      "why-enable-routine": { text: "if the window is weekly, one meeting changes nothing" },
    });
    assert.deepEqual(result.unjustified, []);
  });

  it("warns when motive is asserted with nothing that could falsify it", () => {
    const result = layer.assess(answered(["read-guarding", "act-what"]));
    assert.ok(result.warnings.some((line) => line.includes("nothing that could falsify it")));
  });
});

describe("asking", () => {
  it("asks for evidence before temperament", () => {
    const next = layer.nextQuestion({});
    assert.equal(next.kind, "evidence");
    assert.equal(next.id, "act-what");
  });

  it("puts exposures last, and each with the question that justifies collecting it", () => {
    const prompts = layer.operationalPrompts();
    assert.ok(prompts.length >= 5);
    for (const prompt of prompts) {
      assert.equal(prompt.needs, "why-" + prompt.id);
      assert.match(prompt.needsText, /decision changes/i);
    }
    const answeredEverythingButOperational = Object.fromEntries(
      layer.QUESTIONS.filter((q) => q.kind !== "operational").map((q) => [q.id, { text: "x" }]),
    );
    assert.equal(layer.nextQuestion(answeredEverythingButOperational).kind, "operational");
  });

  it("has nothing left to ask when the layer is complete", () => {
    const everything = Object.fromEntries(layer.QUESTIONS.map((q) => [q.id, { text: "x" }]));
    assert.equal(layer.nextQuestion(everything), null);
  });
});
