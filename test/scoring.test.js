import test from "node:test";
import assert from "node:assert/strict";
import { ITEM_LIST, calculatePps, validateAnswers } from "../public/scoring.js";

function all(value) {
  return Object.fromEntries(ITEM_LIST.map((item) => [item, value]));
}

test("requires all 36 answers in the valid range", () => {
  assert.equal(validateAnswers(all(3)), true);
  const missing = all(3);
  delete missing.X3;
  assert.equal(validateAnswers(missing), false);
  assert.equal(validateAnswers({ ...all(3), X3: 6 }), false);
});

test("all midpoint answers reproduce the Python scale means", () => {
  const result = calculatePps(all(3));
  assert.equal(result.means.Permissive, 3);
  assert.equal(result.means.Authoritative, 3);
  assert.equal(result.means.Authoritarian, 3);
  assert.equal(result.finalStyle, "Permissive");
});

test("each scale mean uses exactly its twelve source items", () => {
  const answers = all(1);
  for (const item of ["X5", "X7", "X19", "X33", "X43", "X47", "X52", "X62", "X65", "X67", "X78", "X80"]) answers[item] = 5;
  const result = calculatePps(answers);
  assert.equal(result.means.Authoritative, 5);
  assert.equal(result.means.Authoritarian, 1);
  assert.equal(result.means.Permissive, 1);
  assert.equal(result.finalStyle, "Authoritative");
});

test("similarities are normalized", () => {
  const result = calculatePps(all(4));
  const total = Object.values(result.similarities).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 1e-12);
  for (const value of Object.values(result.percentiles)) assert.ok(value >= 0 && value <= 100);
});
