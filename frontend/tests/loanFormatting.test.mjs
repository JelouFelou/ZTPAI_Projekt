import { test } from "node:test";
import assert from "node:assert/strict";
import { loanDate } from "../src/loanFormatting.ts";

test("formats winter dates in Polish and Warsaw time", () => {
  const formatted = loanDate("2026-01-15T12:00:00Z");
  assert.match(formatted, /15 sty 2026/);
  assert.match(formatted, /13:00/);
});

test("uses Warsaw daylight saving time for summer dates", () => {
  assert.match(loanDate("2026-07-15T12:00:00Z"), /14:00/);
});
