#!/usr/bin/env node
/**
 * Report-only interpolation audit.
 *
 * The app builds markup with template literals. That is safe today because esc() wraps the
 * values that come from a person, but nothing stops the next interpolation from skipping it.
 * This prints every interpolation in app.js that is not wrapped, so a reviewer can look
 * rather than assume. It exits 0 on purpose: it is a prompt, not a gate.
 */

const fs = require("node:fs");

const source = fs.readFileSync("app.js", "utf8");
const safe = /^(esc|renderMD|inlineMd|highlightHTML|highlightPlain)\(/;
const lines = source.split("\n");
let unwrapped = 0;

lines.forEach((line, index) => {
  for (const match of line.matchAll(/\$\{([^{}]+)\}/g)) {
    const expression = match[1].trim();
    if (safe.test(expression)) continue;
    if (/^[\d\s+\-*/.]+$/.test(expression)) continue; // arithmetic and literals
    if (/^(i|index|n|count|score)$/.test(expression)) continue; // loop counters
    unwrapped += 1;
    console.log(`${index + 1}: ${expression.slice(0, 70)}`);
  }
});

console.log(`\n${unwrapped} interpolation(s) not wrapped in an escape helper. Read each one.`);
