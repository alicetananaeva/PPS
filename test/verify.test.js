import test from "node:test";
import assert from "node:assert/strict";
import { parseCode } from "../src/verify-worker.js";

test("accepts PPS and DSLQ completion codes case-insensitively", () => {
  assert.deepEqual(parseCode("pps-abcd-2345"), { code: "PPS-ABCD-2345", survey: "PPS" });
  assert.deepEqual(parseCode(" DSLQ-WXYZ-9876 "), { code: "DSLQ-WXYZ-9876", survey: "DSLQ" });
});

test("rejects malformed codes and ambiguous characters", () => {
  assert.equal(parseCode("PPS-ABCD-1234"), null);
  assert.equal(parseCode("PPS-ABCI-2345"), null);
  assert.equal(parseCode("something else"), null);
});
